import io
import os
import csv
import json
import re
import uuid
import random
import hmac
import hashlib
import logging
import urllib.request
import urllib.parse
import urllib.error
from typing import List, Literal, Optional
from datetime import datetime, timezone, date, timedelta
from fastapi import FastAPI, HTTPException, Query, Response, Depends, Header, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neg_security")

TIME_REGEX = re.compile(r"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$")

def validate_time_format(time_str: str, field_name: str = "Time"):
    if not time_str or not TIME_REGEX.match(time_str.strip()):
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be a valid 24-hour time format (HH:MM or HH:MM:SS, e.g. 08:30 or 17:45)"
        )


app = FastAPI(
    title="National Executive Guard (NEG) - Command & Personnel Portal",
    description="Centralized operations portal backed by independent SQLite SQL Database with RBAC, Presence, Payroll, Armory, VIP Escort, and Training Certifications.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"}
    )

# Initialize SQLite database on startup
db.init_db()

SERVER_INSTANCE_ID = str(uuid.uuid4())
SERVER_BOOT_TIME = datetime.now(timezone.utc).isoformat()
ACTIVE_AUTH_TOKENS = {}

# -------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str

class UserRegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    badge_id: str
    rank: Optional[str] = "Officer I"
    division: Optional[str] = "Unassigned"
    join_date: Optional[str] = None
    license_certificate: Optional[str] = "Standard Guard License"
    id_card_number: Optional[str] = ""
    id_card_expiry: Optional[str] = ""
    id_card_image: Optional[str] = ""
    driving_license_number: Optional[str] = ""
    driving_license_expiry: Optional[str] = ""
    driving_license_image: Optional[str] = ""
    expungement_letter_number: Optional[str] = ""
    expungement_letter_expiry: Optional[str] = ""
    expungement_letter_image: Optional[str] = ""
    plate_riot_van: Optional[str] = ""
    plate_patrol_motorcycle: Optional[str] = ""
    plate_g500: Optional[str] = ""
    plate_ioniq_4: Optional[str] = ""
    plate_presidential_limo: Optional[str] = ""
    discord_id: Optional[str] = ""
    discord_username: Optional[str] = ""
    discord_avatar: Optional[str] = ""

class UserCreateRequest(BaseModel):
    personnel_id: Optional[str] = None
    username: str
    password: str
    role: str = "OFFICER"
    created_by: str = "Administrator"
    name: Optional[str] = None
    badge_id: Optional[str] = None
    rank: Optional[str] = None
    join_date: Optional[str] = None
    license_certificate: Optional[str] = None
    status: Optional[Literal["Active", "Inactive", "Disbanded", "Pending"]] = "Active"
    discord_id: Optional[str] = ""
    discord_username: Optional[str] = ""
    discord_avatar: Optional[str] = ""

class UserResetPasswordRequest(BaseModel):
    new_password: str

class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None
    rank: Optional[str] = None
    role: Optional[str] = None
    status: Optional[Literal["Active", "Inactive", "Disbanded", "Pending"]] = None
    discord_id: Optional[str] = None
    discord_username: Optional[str] = None
    discord_avatar: Optional[str] = None

class PresenceCreate(BaseModel):
    personnel_id: str
    date: str
    shift: Optional[str] = None
    time_in: str
    time_out: Optional[str] = None
    escort_count: int = 0
    notes: Optional[str] = ""

class PresenceTimeOut(BaseModel):
    time_out: str

class PayrollCreate(BaseModel):
    personnel_id: str
    salary: float = Field(gt=0)
    salary_date: str
    week_number: Optional[int] = None
    notes: Optional[str] = ""

class ArmoryIssueRequest(BaseModel):
    item_type: str
    item: str
    name: str
    serial_number: Optional[str] = "-"
    quantity: int = 1
    condition: Optional[str] = "Serviceable - Excellent"
    expected_return: Optional[str] = "--"
    notes: Optional[str] = ""

class ArmoryAddRequest(BaseModel):
    name: str
    item_type: str
    item: str
    serial_number: Optional[str] = "-"
    quantity: int = 1
    condition: Optional[str] = "Serviceable - Excellent"
    status: Optional[str] = "In Armory"
    assigned_to: Optional[str] = "--"
    issue_date: Optional[str] = "--"
    expected_return: Optional[str] = "--"

class DepotRestockRequest(BaseModel):
    item_type: str
    item: str
    quantity: int = Field(ge=0)
    mode: Optional[Literal["add", "set"]] = "add"

class ArmoryReturnRequest(BaseModel):
    item_id: str

class EscortCreate(BaseModel):
    principal: str
    threat_level: Literal["Low (Level 1)", "Medium (Level 2)", "High (Level 3)", "Critical (Level 4)"]
    mission_type: str
    origin: str
    destination: Optional[str] = None
    destinations: Optional[List[str]] = None
    lead_agent_id: str
    assigned_officer_ids: Optional[List[str]] = None
    vehicle_convoy: str
    start_time: str
    estimated_completion: str
    notes: Optional[str] = ""

class EscortStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class LetterCreateRequest(BaseModel):
    letter_type: Literal[
        "First Written Warning",
        "Second Written Warning",
        "Final Written Warning",
        "Dismissal / Termination Letter",
        "Warning Letter (SP-1)",
        "Warning Letter (SP-2)",
        "Warning Letter (SP-3)"
    ]
    personnel_id: str
    letter_number: Optional[str] = None
    issue_date: str
    effective_date: str
    violation_category: str
    severity: Literal["Moderate", "Major", "Critical / Severe"]
    incident_summary: str
    sanctions: str
    authorized_by: str
    notes: Optional[str] = ""

class LetterStatusUpdateRequest(BaseModel):
    status: Literal["Active", "Served", "Appealed", "Revoked"]
    notes: Optional[str] = None


class PersonnelCreate(BaseModel):
    name: str = Field(min_length=1)
    badge_id: str = Field(min_length=1)
    rank: Literal[
        "President",
        "Ministry of Defense and Human Rights",
        "Director",
        "Deputy Director",
        "Master Sergeant",
        "Staff Sergeant",
        "Sergeant",
        "Senior Corporal",
        "Corporal",
        "Senior Officer II",
        "Senior Officer I",
        "Officer II",
        "Officer I",
    ]
    join_date: str = Field(min_length=1)
    license_certificate: str = Field(min_length=1)
    status: Literal["Active", "Inactive", "Disbanded"]
    division: Optional[str] = "Unassigned"
    id_card_number: Optional[str] = ""
    id_card_expiry: Optional[str] = ""
    driving_license_number: Optional[str] = ""
    driving_license_expiry: Optional[str] = ""
    expungement_letter_number: Optional[str] = ""
    expungement_letter_expiry: Optional[str] = ""
    id_card_image: Optional[str] = ""
    driving_license_image: Optional[str] = ""
    expungement_letter_image: Optional[str] = ""
    plate_riot_van: Optional[str] = ""
    plate_patrol_motorcycle: Optional[str] = ""
    plate_g500: Optional[str] = ""
    plate_ioniq_4: Optional[str] = ""
    plate_presidential_limo: Optional[str] = ""

class VehiclePlatesUpdateRequest(BaseModel):
    plate_riot_van: Optional[str] = ""
    plate_patrol_motorcycle: Optional[str] = ""
    plate_g500: Optional[str] = ""
    plate_ioniq_4: Optional[str] = ""
    plate_presidential_limo: Optional[str] = ""

class TrainingCertificationCreate(BaseModel):
    personnel_id: str
    course_title: str
    category: str
    issuing_authority: str
    issue_date: str
    expiry_date: str
    proficiency_score: Optional[str] = "Qualified (Grade C)"
    notes: Optional[str] = ""

class TrainingCertificationUpdate(BaseModel):
    course_title: Optional[str] = None
    category: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    proficiency_score: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class VehicleCreate(BaseModel):
    model: Literal[
        "Armored Riot Van",
        "Patrol Motorcycle",
        "G500",
        "Hyundai IONIQ 4",
        "Presidential Limo"
    ]
    plate_number: str = Field(min_length=1)
    personnel_id: Optional[str] = None
    assigned_to: Optional[str] = None
    badge_id: Optional[str] = None
    division: Optional[str] = "Motor Pool"
    status: Optional[Literal["Available", "Assigned", "Maintenance"]] = "Available"
    assigned_date: Optional[str] = None
    notes: Optional[str] = ""

class VehicleUpdate(BaseModel):
    model: Optional[Literal[
        "Armored Riot Van",
        "Patrol Motorcycle",
        "G500",
        "Hyundai IONIQ 4",
        "Presidential Limo"
    ]] = None
    plate_number: Optional[str] = None
    personnel_id: Optional[str] = None
    assigned_to: Optional[str] = None
    badge_id: Optional[str] = None
    division: Optional[str] = None
    status: Optional[Literal["Available", "Assigned", "Maintenance"]] = None
    assigned_date: Optional[str] = None
    notes: Optional[str] = None

class ResignationProposalCreate(BaseModel):
    personnel_id: str
    effective_date: str
    reason_category: Literal[
        "Personal Circumstances",
        "Career Transition",
        "Medical / Physical Inability",
        "Relocation",
        "Retirement",
        "Other"
    ]
    reason_details: str
    handover_notes: Optional[str] = ""

class ResignationReviewRequest(BaseModel):
    status: Literal["Approved", "Rejected"]
    review_notes: Optional[str] = ""

class ReinstatementRequestCreate(BaseModel):
    username: str
    password: str
    appeal_reason: str
    commitment_statement: str

class ReinstatementReviewRequest(BaseModel):
    status: Literal["Approved", "Rejected"]
    review_notes: Optional[str] = ""

# -------------------------------------------------------------
# Helpers
# -------------------------------------------------------------

def _calculate_duration(time_in_str: str, time_out_str: Optional[str]):
    if not time_out_str:
        return None, None
    try:
        t_in = datetime.strptime(time_in_str, "%H:%M")
        t_out = datetime.strptime(time_out_str, "%H:%M")
        if t_out < t_in:
            t_out += timedelta(days=1)
        duration_minutes = int((t_out - t_in).total_seconds() / 60)
        duration_hours = round(duration_minutes / 60, 2)
        return duration_hours, duration_minutes
    except Exception:
        return None, None

def _presence_response(record):
    if not record:
        return None
    duration_hours, duration_minutes = _calculate_duration(record["time_in"], record.get("time_out"))
    d = dict(record)
    d["duration_hours"] = duration_hours
    d["duration_minutes"] = duration_minutes
    return d

def _evaluate_cert_status(expiry_str: str) -> str:
    try:
        exp_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()
        days = (exp_date - date.today()).days
        if days < 0:
            return "Expired"
        elif days <= 30:
            return "Expiring Soon"
        else:
            return "Active"
    except Exception:
        return "Active"

TOKEN_SECRET = os.environ.get("TOKEN_SECRET", "NEG_SEC_SECRET_KEY_2026_TOKEN_AUTH")

def make_auth_token(user_id: str) -> str:
    sig = hmac.new(TOKEN_SECRET.encode(), user_id.encode(), hashlib.sha256).hexdigest()[:16]
    token = f"NEG-AUTH-{user_id}-{sig}"
    ACTIVE_AUTH_TOKENS[token] = user_id
    return token

def resolve_auth_token(token: str) -> Optional[str]:
    if not token:
        return None
    if token in ACTIVE_AUTH_TOKENS:
        return ACTIVE_AUTH_TOKENS[token]
    if token.startswith("NEG-AUTH-"):
        last_dash = token.rfind("-")
        if last_dash > 9:
            user_id = token[9:last_dash]
            sig = token[last_dash + 1:]
            expected_sig = hmac.new(TOKEN_SECRET.encode(), user_id.encode(), hashlib.sha256).hexdigest()[:16]
            if hmac.compare_digest(sig, expected_sig):
                ACTIVE_AUTH_TOKENS[token] = user_id
                return user_id
    return None

def require_authenticated_user(authorization: Optional[str] = Header(default=None)):
    scheme, _, token = (authorization or "").partition(" ")
    user_id = resolve_auth_token(token) if scheme.lower() == "bearer" else None
    if not user_id:
        raise HTTPException(status_code=401, detail="A valid active security token is required")
    user = db.get_user_by_id(user_id)
    if not user or user["status"] == "Disbanded":
        raise HTTPException(status_code=403, detail="Security clearance account has been disbanded by High Command. Access denied.")
    if user["status"] == "Pending":
        raise HTTPException(status_code=403, detail="Security clearance pending High Command review. Access denied.")
    return user

# -------------------------------------------------------------
# Authentication & Discord Synchronization Endpoints
# -------------------------------------------------------------

@app.post("/api/auth/login")
def login(creds: LoginRequest):
    user = db.get_user_by_username(creds.username)
    if not user or user["password"] != creds.password:
        raise HTTPException(status_code=401, detail="Invalid Security Badge / Password combination")
    
    if user["status"] == "Pending":
        raise HTTPException(
            status_code=403, 
            detail="Security Clearance Pending: Your account has been registered and is awaiting authorization from High Command. Please contact an administrator or wait for review."
        )

    if user["status"] == "Disbanded":
        raise HTTPException(status_code=403, detail="Security clearance account has been disbanded by High Command. Access denied.")

    last_login = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    db.update_last_login(user["id"], last_login)
    user["last_login"] = last_login

    token = make_auth_token(user["id"])
    
    return {
        "success": True,
        "token": token,
        "server_instance_id": SERVER_INSTANCE_ID,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "personnel_id": user["personnel_id"],
            "name": user["name"],
            "rank": user["rank"],
            "role": user["role"],
            "status": user["status"],
            "last_login": user["last_login"],
            "discord_id": user.get("discord_id", ""),
            "discord_username": user.get("discord_username", ""),
            "discord_avatar": user.get("discord_avatar", ""),
        }
    }

@app.get("/api/auth/verify")
def verify_session(authorization: Optional[str] = Header(default=None)):
    user = require_authenticated_user(authorization)
    return {
        "valid": True,
        "server_instance_id": SERVER_INSTANCE_ID,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "personnel_id": user["personnel_id"],
            "name": user["name"],
            "rank": user["rank"],
            "role": user["role"],
            "status": user["status"],
            "last_login": user["last_login"],
            "discord_id": user.get("discord_id", ""),
            "discord_username": user.get("discord_username", ""),
            "discord_avatar": user.get("discord_avatar", ""),
        }
    }

@app.post("/api/auth/register")
def register_officer(data: UserRegisterRequest):
    clean_username = data.username.strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="Username is required")
    if not data.password or len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Full Name is required")
    if not data.badge_id.strip():
        raise HTTPException(status_code=400, detail="Badge Call-sign is required")
        
    existing_user = db.get_user_by_username(clean_username)
    if existing_user:
        raise HTTPException(status_code=400, detail="This username is already taken. Please choose another.")
        
    all_personnel = db.get_all_personnel()
    for p in all_personnel:
        if p["badge_id"].strip().upper() == data.badge_id.strip().upper():
            raise HTTPException(status_code=400, detail=f"Badge Call-sign '{data.badge_id}' is already assigned to {p['name']}.")
            
    if data.discord_id and data.discord_id.strip():
        existing_discord = db.get_user_by_discord_id(data.discord_id.strip())
        if existing_discord:
            raise HTTPException(status_code=400, detail=f"This Discord account is already linked to user '{existing_discord['username']}'.")
            
    p_count = len(all_personnel)
    new_p_id = f"NEG-{p_count + 1:03d}"
    
    personnel_entry = db.create_personnel({
        "id": new_p_id,
        "name": data.name.strip(),
        "badge_id": data.badge_id.strip(),
        "rank": data.rank or "Officer I",
        "division": data.division or "Unassigned",
        "join_date": data.join_date or date.today().isoformat(),
        "license_certificate": data.license_certificate or "Standard Guard License",
        "status": "Pending",
        "id_card_number": data.id_card_number or "",
        "id_card_expiry": data.id_card_expiry or "",
        "id_card_image": data.id_card_image or "",
        "driving_license_number": data.driving_license_number or "",
        "driving_license_expiry": data.driving_license_expiry or "",
        "driving_license_image": data.driving_license_image or "",
        "expungement_letter_number": data.expungement_letter_number or "",
        "expungement_letter_expiry": data.expungement_letter_expiry or "",
        "expungement_letter_image": data.expungement_letter_image or "",
        "plate_riot_van": data.plate_riot_van or "",
        "plate_patrol_motorcycle": data.plate_patrol_motorcycle or "",
        "plate_g500": data.plate_g500 or "",
        "plate_ioniq_4": data.plate_ioniq_4 or "",
        "plate_presidential_limo": data.plate_presidential_limo or "",
        "discord_id": data.discord_id or "",
        "discord_username": data.discord_username or "",
    })
    
    u_count = len(db.get_all_users())
    new_u_id = f"USR-{u_count + 1:03d}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    
    new_user = db.create_user({
        "id": new_u_id,
        "username": clean_username,
        "password": data.password,
        "personnel_id": new_p_id,
        "name": data.name.strip(),
        "rank": data.rank or "Officer I",
        "role": "OFFICER",
        "status": "Pending",
        "created_at": created_at,
        "created_by": "Self-Registration",
        "last_login": "--",
        "discord_id": data.discord_id or "",
        "discord_username": data.discord_username or "",
        "discord_avatar": data.discord_avatar or "",
    })
    
    return {
        "success": True,
        "message": "Security clearance registration submitted. Your account is pending High Command review.",
        "user_id": new_u_id,
        "personnel_id": new_p_id,
        "status": "Pending",
        "username": clean_username,
    }

@app.get("/api/health")
def server_health():
    return {
        "status": "healthy",
        "server_instance_id": SERVER_INSTANCE_ID,
        "boot_time": SERVER_BOOT_TIME,
    }

@app.get("/api/auth/users")
def get_all_users():
    return db.get_all_users()

@app.post("/api/auth/users")
def create_user_account(data: UserCreateRequest):
    existing = db.get_user_by_username(data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username is already registered")

    personnel_entry = None
    if data.personnel_id:
        personnel_entry = db.get_personnel_by_id(data.personnel_id)

    if not personnel_entry and data.name and data.badge_id:
        p_count = len(db.get_all_personnel())
        new_p_id = f"NEG-{p_count + 1:03d}"
        personnel_entry = db.create_personnel({
            "id": new_p_id,
            "name": data.name,
            "badge_id": data.badge_id,
            "rank": data.rank or "Officer I",
            "join_date": data.join_date or date.today().isoformat(),
            "license_certificate": data.license_certificate or "Standard Guard License",
            "status": data.status or "Active",
            "discord_id": data.discord_id or "",
            "discord_username": data.discord_username or "",
        })

    name = personnel_entry["name"] if personnel_entry else (data.name or data.username)
    rank = personnel_entry["rank"] if personnel_entry else (data.rank or "Officer I")
    personnel_id = personnel_entry["id"] if personnel_entry else data.personnel_id

    u_count = len(db.get_all_users())
    new_user_id = f"USR-{u_count + 1:03d}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")

    user_status = personnel_entry["status"] if personnel_entry else (data.status or "Active")

    new_user = db.create_user({
        "id": new_user_id,
        "username": data.username,
        "password": data.password,
        "personnel_id": personnel_id,
        "name": name,
        "rank": rank,
        "role": data.role.upper(),
        "status": user_status,
        "created_at": created_at,
        "created_by": data.created_by,
        "last_login": "--",
        "discord_id": data.discord_id or "",
        "discord_username": data.discord_username or "",
        "discord_avatar": data.discord_avatar or "",
    })
    return new_user

@app.put("/api/auth/users/{user_id}")
def update_user_account(user_id: str, data: UserUpdateRequest):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = data.status if data.status else user["status"]
    if user["username"].lower() == "commander" and new_status == "Disbanded":
        raise HTTPException(status_code=403, detail="Cannot disband master commander user account")

    update_payload = {
        "role": data.role.upper() if data.role else user["role"],
        "status": new_status,
    }
    if data.username and data.username.strip():
        new_username = data.username.strip()
        if new_username.lower() != user["username"].lower():
            existing = db.get_user_by_username(new_username)
            if existing and existing["id"] != user_id:
                raise HTTPException(status_code=400, detail="Username is already taken by another account")
        update_payload["username"] = new_username
    if data.name:
        update_payload["name"] = data.name
    if data.rank:
        update_payload["rank"] = data.rank
    if data.discord_id is not None:
        update_payload["discord_id"] = data.discord_id
    if data.discord_username is not None:
        update_payload["discord_username"] = data.discord_username
    if data.discord_avatar is not None:
        update_payload["discord_avatar"] = data.discord_avatar

    if data.password and data.password.strip():
        db.update_user_password(user_id, data.password.strip())

    updated = db.update_user(user_id, update_payload)

    if new_status == "Disbanded":
        tokens_to_revoke = [t for t, uid in ACTIVE_AUTH_TOKENS.items() if uid == user_id]
        for t in tokens_to_revoke:
            ACTIVE_AUTH_TOKENS.pop(t, None)

    return updated

@app.post("/api/auth/users/{user_id}/approve")
def approve_user_account(user_id: str):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updated = db.approve_user(user_id)
    return {"success": True, "message": f"Security clearance approved for {user['username']}.", "user": updated}

@app.post("/api/auth/users/{user_id}/reject")
def reject_user_account(user_id: str, delete: bool = Query(default=True)):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["username"].lower() == "commander":
        raise HTTPException(status_code=403, detail="Cannot reject master commander user account")
    db.reject_user(user_id, delete_records=delete)
    return {"success": True, "message": f"Application for {user['username']} has been {'dismissed' if delete else 'disbanded'}."}

@app.post("/api/auth/users/{user_id}/toggle")
def toggle_user_status(user_id: str):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["username"].lower() == "commander" and user["status"] != "Disbanded":
        raise HTTPException(status_code=403, detail="Cannot disband master commander user account")

    updated = db.toggle_user_status(user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    if updated.get("status") == "Disbanded":
        tokens_to_revoke = [t for t, uid in ACTIVE_AUTH_TOKENS.items() if uid == user_id]
        for t in tokens_to_revoke:
            ACTIVE_AUTH_TOKENS.pop(t, None)

    return {"success": True, "user": updated}

@app.post("/api/auth/users/{user_id}/reset-password")
def reset_user_password(user_id: str, data: UserResetPasswordRequest):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.update_user_password(user_id, data.new_password)
    return {"success": True, "message": "Password reset successfully."}

@app.delete("/api/auth/users/{user_id}")
def delete_user_account(user_id: str):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["username"].lower() == "commander":
        raise HTTPException(status_code=403, detail="Cannot delete master commander user account")
    db.delete_user(user_id)
    return {"success": True, "deleted_id": user_id}

# -------------------------------------------------------------
# Dashboard Statistics
# -------------------------------------------------------------

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    personnel = db.get_all_personnel()
    presence = db.get_all_presence()
    payroll = db.get_all_payroll()
    armory = db.get_all_armory()
    escort = db.get_all_escort_missions()
    vehicles = db.get_all_vehicles()

    active_personnel = len([p for p in personnel if p["status"] == "Active"])
    total_payroll = sum(p["salary"] for p in payroll)
    issued_equipment = len([a for a in armory if a["status"] == "Issued"])
    active_escorts = len([e for e in escort if e["status"] == "In Transit"])
    on_duty_count = len([p for p in presence if not p.get("time_out") or p.get("time_out") == "" or p.get("time_out") == "--"])
    assigned_vehicles = len([v for v in vehicles if v["status"] == "Assigned"])
    available_vehicles = len([v for v in vehicles if v["status"] == "Available"])

    return {
        "active_personnel": active_personnel,
        "total_personnel": len(personnel),
        "total_payroll_obligation": total_payroll,
        "payroll_total": total_payroll,
        "issued_equipment": issued_equipment,
        "armory_issued": issued_equipment,
        "armory_total": len(armory),
        "active_escorts": active_escorts,
        "total_escorts": len(escort),
        "total_shifts_logged": len(presence),
        "on_duty_count": on_duty_count,
        "total_vehicles": len(vehicles),
        "assigned_vehicles": assigned_vehicles,
        "available_vehicles": available_vehicles,
    }

# -------------------------------------------------------------
# Personnel Endpoints (Independent SQLite)
# -------------------------------------------------------------

@app.get("/api/personnel")
def get_personnel():
    return db.get_all_personnel()

@app.post("/api/personnel")
def create_personnel(data: PersonnelCreate):
    personnel_list = db.get_all_personnel()
    new_id = f"NEG-{len(personnel_list) + 1:03d}"
    record = {
        "id": new_id,
        "name": data.name,
        "badge_id": data.badge_id,
        "rank": data.rank,
        "join_date": data.join_date,
        "license_certificate": data.license_certificate,
        "status": data.status,
        "division": data.division or "Unassigned",
        "id_card_number": data.id_card_number or "",
        "id_card_expiry": data.id_card_expiry or "",
        "driving_license_number": data.driving_license_number or "",
        "driving_license_expiry": data.driving_license_expiry or "",
        "expungement_letter_number": data.expungement_letter_number or "",
        "expungement_letter_expiry": data.expungement_letter_expiry or "",
        "id_card_image": data.id_card_image or "",
        "driving_license_image": data.driving_license_image or "",
        "expungement_letter_image": data.expungement_letter_image or "",
        "plate_riot_van": data.plate_riot_van or "",
        "plate_patrol_motorcycle": data.plate_patrol_motorcycle or "",
        "plate_g500": data.plate_g500 or "",
        "plate_ioniq_4": data.plate_ioniq_4 or "",
        "plate_presidential_limo": data.plate_presidential_limo or "",
    }
    created = db.create_personnel(record)
    return created

@app.put("/api/personnel/{id}")
def update_personnel(id: str, data: PersonnelCreate):
    record = db.get_personnel_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Personnel record not found")
    
    updated = db.update_personnel(id, {
        "name": data.name,
        "badge_id": data.badge_id,
        "rank": data.rank,
        "join_date": data.join_date,
        "license_certificate": data.license_certificate,
        "status": data.status,
        "division": data.division or "Unassigned",
        "id_card_number": data.id_card_number or "",
        "id_card_expiry": data.id_card_expiry or "",
        "driving_license_number": data.driving_license_number or "",
        "driving_license_expiry": data.driving_license_expiry or "",
        "expungement_letter_number": data.expungement_letter_number or "",
        "expungement_letter_expiry": data.expungement_letter_expiry or "",
        "id_card_image": data.id_card_image or "",
        "driving_license_image": data.driving_license_image or "",
        "expungement_letter_image": data.expungement_letter_image or "",
        "plate_riot_van": data.plate_riot_van or "",
        "plate_patrol_motorcycle": data.plate_patrol_motorcycle or "",
        "plate_g500": data.plate_g500 or "",
        "plate_ioniq_4": data.plate_ioniq_4 or "",
        "plate_presidential_limo": data.plate_presidential_limo or "",
    })
    return updated

@app.put("/api/personnel/{id}/vehicle-plates")
def update_personnel_vehicle_plates(id: str, data: VehiclePlatesUpdateRequest):
    record = db.get_personnel_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Personnel record not found")
    
    updated = db.update_personnel_vehicle_plates(id, data.dict())
    return updated

@app.delete("/api/personnel/{id}")
def delete_personnel(id: str):
    record = db.get_personnel_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Personnel record not found")
    db.delete_personnel(id)
    return {"success": True, "deleted_id": id}

@app.post("/api/personnel/sync-sheet")
def sync_sheet():
    count = len(db.get_all_personnel())
    return {
        "success": True,
        "count": count,
        "message": f"SQLite Database Active: {count} personnel safely stored in local database."
    }

# -------------------------------------------------------------
# Presence Records Endpoints
# -------------------------------------------------------------

@app.get("/api/presence")
def get_presence():
    records = db.get_all_presence()
    return [_presence_response(r) for r in records]

@app.post("/api/presence")
def log_presence(data: PresenceCreate):
    validate_time_format(data.time_in, "Time In")
    if data.time_out and data.time_out.strip():
        validate_time_format(data.time_out, "Time Out")
    officer = db.get_personnel_by_id(data.personnel_id)
    officer_name = officer["name"] if officer else "Unknown"
    badge_id = officer["badge_id"] if officer else "-"

    shift = data.shift
    if not shift or not shift.strip():
        try:
            hour = int(data.time_in.split(":")[0])
            shift = "Night" if (hour >= 18 or hour < 6) else "Day"
        except Exception:
            shift = "Day"

    record = db.create_presence({
        "date": data.date,
        "shift": shift,
        "personnel_id": data.personnel_id,
        "name": officer_name,
        "badge_id": badge_id,
        "time_in": data.time_in,
        "time_out": data.time_out if data.time_out and data.time_out.strip() else None,
        "escort_count": data.escort_count,
        "notes": data.notes or "",
    })
    return _presence_response(record)

@app.patch("/api/presence/{id}/time-out")
def complete_presence(id: int, data: PresenceTimeOut):
    validate_time_format(data.time_out, "Time Out")
    record = db.get_presence_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Presence record not found")
    updated = db.update_presence_timeout(id, data.time_out)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated presence record")
    return _presence_response(updated)

@app.delete("/api/presence/{id}")
def delete_presence(id: int):
    record = db.get_presence_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Presence record not found")
    db.delete_presence(id)
    return {"success": True, "deleted_id": id}

# -------------------------------------------------------------
# Payroll Endpoints
# -------------------------------------------------------------

@app.get("/api/payroll")
def get_payroll():
    return db.get_all_payroll()

@app.post("/api/payroll")
def create_payroll(data: PayrollCreate):
    officer = db.get_personnel_by_id(data.personnel_id)
    officer_name = officer["name"] if officer else "Unknown"
    officer_rank = officer["rank"] if officer else "Officer I"

    week_num = data.week_number
    if not week_num:
        try:
            d = datetime.strptime(data.salary_date, "%Y-%m-%d").date()
            week_num = d.isocalendar()[1]
        except Exception:
            week_num = 1

    record = db.create_payroll({
        "personnel_id": data.personnel_id,
        "name": officer_name,
        "rank": officer_rank,
        "salary": data.salary,
        "salary_date": data.salary_date,
        "week_number": week_num,
        "notes": data.notes or "",
    })
    return record

# -------------------------------------------------------------
# Armory & Bulk Logistics Endpoints
# -------------------------------------------------------------

@app.get("/api/armory")
def get_armory():
    return db.get_all_armory()

@app.get("/api/armory/depot-stockpile")
def get_depot_stockpile():
    stockpiles = db.get_depot_stockpiles()
    armory = db.get_all_armory()
    
    issued = {}
    for a in armory:
        if a["status"] == "Issued":
            itype = a["item_type"]
            iname = a["item"]
            if itype not in issued:
                issued[itype] = {}
            issued[itype][iname] = issued[itype].get(iname, 0) + a.get("quantity", 1)

    return {
        "stockpiles": stockpiles,
        "issued": issued
    }

@app.post("/api/armory/issue")
def issue_armory_item(data: ArmoryIssueRequest):
    today_str = date.today().isoformat()
    armory_list = db.get_all_armory()
    new_id = f"ARM-{len(armory_list) + 1:02d}"

    # Deduct from depot if non-weapon bulk
    if data.item_type != "Weapon":
        db.adjust_depot_stock(data.item_type, data.item, -data.quantity)

    new_record = db.create_armory_item({
        "id": new_id,
        "restock_date": today_str,
        "name": data.name,
        "item_type": data.item_type,
        "item": data.item,
        "serial_number": data.serial_number if data.item_type == "Weapon" else "-",
        "quantity": data.quantity,
        "condition": data.condition or "Serviceable - Excellent",
        "status": "Issued",
        "assigned_to": data.name,
        "issue_date": today_str,
        "expected_return": data.expected_return or "--",
        "notes": data.notes or "",
    })
    return new_record

@app.post("/api/armory/return")
def return_armory_item(data: ArmoryReturnRequest):
    record = db.get_armory_by_id(data.item_id)
    if not record:
        raise HTTPException(status_code=404, detail="Armory item not found")

    if record["status"] != "Issued":
        raise HTTPException(status_code=400, detail="Item is not currently issued")

    # Restore to depot if bulk
    if record["item_type"] != "Weapon":
        db.adjust_depot_stock(record["item_type"], record["item"], record["quantity"])

    updated = db.update_armory_item(data.item_id, {
        "status": "Returned",
        "assigned_to": "--",
        "issue_date": "--",
        "expected_return": "--",
    })
    return updated

@app.post("/api/armory/{item_id}/return")
def return_armory_item_by_path(item_id: str):
    return return_armory_item(ArmoryReturnRequest(item_id=item_id))

@app.post("/api/armory")
@app.post("/api/armory/add")
def add_armory_item(data: ArmoryAddRequest):
    armory_list = db.get_all_armory()
    new_id = f"ARM-{len(armory_list) + 1:02d}"
    today_str = date.today().isoformat()

    record = db.create_armory_item({
        "id": new_id,
        "restock_date": today_str,
        "name": data.name,
        "item_type": data.item_type,
        "item": data.item,
        "serial_number": data.serial_number or "-",
        "quantity": data.quantity,
        "condition": data.condition or "Serviceable - Excellent",
        "status": data.status or "In Armory",
        "assigned_to": data.assigned_to or "--",
        "issue_date": data.issue_date or "--",
        "expected_return": data.expected_return or "--",
        "notes": "",
    })
    return record

@app.post("/api/armory/depot-stockpile/restock")
@app.post("/api/armory/restock-depot")
def restock_depot_item(data: DepotRestockRequest, user: dict = Depends(require_authenticated_user)):
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Restricted action: Only administrators can restock or edit depot stockpiles.")
    try:
        if data.mode == "set":
            new_stock = db.set_depot_stock(data.item_type, data.item, data.quantity)
        else:
            new_stock = db.restock_depot(data.item_type, data.item, data.quantity)
        return {
            "success": True,
            "item_type": data.item_type,
            "item": data.item,
            "new_stock": new_stock
        }
    except Exception as e:
        logger.error(f"Error restocking depot stockpile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update depot reserve: {str(e)}")


# -------------------------------------------------------------
# Escort Missions Endpoints
# -------------------------------------------------------------

@app.get("/api/escort")
def get_escort_missions():
    return db.get_all_escort_missions()

@app.post("/api/escort")
def create_escort_mission(data: EscortCreate):
    agent = db.get_personnel_by_id(data.lead_agent_id)
    lead_name = f"{agent['name']} ({agent['rank']})" if agent else "Unknown Agent"

    all_dests = data.destinations if data.destinations and len(data.destinations) > 0 else ([data.destination] if data.destination else ["Undisclosed"])
    dest_str = " → ".join(all_dests)

    # Multi-assigned officers support
    assigned_ids = list(data.assigned_officer_ids) if data.assigned_officer_ids else []
    if data.lead_agent_id not in assigned_ids:
        assigned_ids.insert(0, data.lead_agent_id)

    assigned_names = []
    for pid in assigned_ids:
        p = db.get_personnel_by_id(pid)
        if p:
            assigned_names.append(f"{p['name']} ({p['rank']})")
        else:
            assigned_names.append(pid)

    if not assigned_names:
        assigned_names = [lead_name]

    missions = db.get_all_escort_missions()
    mission_id = f"ESC-2026-{len(missions) + 81:03d}"

    record = db.create_escort_mission({
        "id": mission_id,
        "principal": data.principal,
        "threat_level": data.threat_level,
        "mission_type": data.mission_type,
        "origin": data.origin,
        "destination": dest_str,
        "destinations_json": json.dumps(all_dests),
        "lead_agent": lead_name,
        "lead_agent_id": data.lead_agent_id,
        "team_size": len(assigned_names),
        "assigned_personnel_json": json.dumps(assigned_names),
        "vehicle_convoy": data.vehicle_convoy,
        "start_time": data.start_time,
        "estimated_completion": data.estimated_completion,
        "status": "Scheduled",
        "notes": data.notes or "",
    })
    return record

@app.post("/api/escort/{id}/status")
def update_escort_status(id: str, data: EscortStatusUpdate):
    mission = db.get_escort_mission_by_id(id)
    if not mission:
        raise HTTPException(status_code=404, detail="Escort mission not found")
    updated = db.update_escort_mission_status(id, data.status, data.notes)
    return {"success": True, "mission": updated}

# -------------------------------------------------------------
# Department Vehicles Fleet & Ownership Endpoints
# -------------------------------------------------------------

@app.get("/api/vehicles")
def get_department_vehicles():
    return db.get_all_vehicles()

@app.get("/api/vehicles/{vehicle_id}")
def get_single_vehicle(vehicle_id: str):
    veh = db.get_vehicle_by_id(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle record not found")
    return veh

@app.get("/api/personnel/{personnel_id}/vehicles")
def get_personnel_vehicles(personnel_id: str):
    return db.get_vehicles_by_personnel_id(personnel_id)

@app.post("/api/vehicles")
def register_department_vehicle(data: VehicleCreate, user: dict = Depends(require_authenticated_user)):
    assigned_to = data.assigned_to
    badge_id = data.badge_id
    division = data.division
    if data.personnel_id:
        p = db.get_personnel_by_id(data.personnel_id)
        if p:
            assigned_to = p["name"]
            badge_id = p.get("badge_id", "-")
            if not division or division == "Motor Pool":
                division = p.get("division", "Motor Pool")

    created = db.create_vehicle({
        "model": data.model,
        "plate_number": data.plate_number,
        "personnel_id": data.personnel_id,
        "assigned_to": assigned_to or "Unassigned / Motor Pool",
        "badge_id": badge_id or "-",
        "division": division or "Motor Pool",
        "status": data.status or ("Assigned" if data.personnel_id else "Available"),
        "assigned_date": data.assigned_date or date.today().isoformat(),
        "notes": data.notes or "",
    })
    return created

@app.put("/api/vehicles/{vehicle_id}")
def update_department_vehicle(vehicle_id: str, data: VehicleUpdate, user: dict = Depends(require_authenticated_user)):
    veh = db.get_vehicle_by_id(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle record not found")
    
    update_dict = {}
    if data.model is not None:
        update_dict["model"] = data.model
    if data.plate_number is not None:
        update_dict["plate_number"] = data.plate_number
    if data.personnel_id is not None:
        update_dict["personnel_id"] = data.personnel_id
        if data.personnel_id:
            p = db.get_personnel_by_id(data.personnel_id)
            if p:
                update_dict["assigned_to"] = p["name"]
                update_dict["badge_id"] = p.get("badge_id", "-")
                if data.division is None:
                    update_dict["division"] = p.get("division", "Motor Pool")
                if data.status is None:
                    update_dict["status"] = "Assigned"
        else:
            update_dict["assigned_to"] = "Unassigned / Motor Pool"
            update_dict["badge_id"] = "-"
            if data.status is None:
                update_dict["status"] = "Available"
    if data.assigned_to is not None:
        update_dict["assigned_to"] = data.assigned_to
    if data.badge_id is not None:
        update_dict["badge_id"] = data.badge_id
    if data.division is not None:
        update_dict["division"] = data.division
    if data.status is not None:
        update_dict["status"] = data.status
    if data.assigned_date is not None:
        update_dict["assigned_date"] = data.assigned_date
    if data.notes is not None:
        update_dict["notes"] = data.notes

    updated = db.update_vehicle(vehicle_id, update_dict)
    return updated

@app.delete("/api/vehicles/{vehicle_id}")
def delete_department_vehicle(vehicle_id: str, user: dict = Depends(require_authenticated_user)):
    veh = db.get_vehicle_by_id(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle record not found")
    db.delete_vehicle(vehicle_id)
    return {"success": True, "deleted_id": vehicle_id}

# -------------------------------------------------------------
# Training & Certifications Endpoints
# -------------------------------------------------------------

@app.get("/api/training")
def get_training_certifications():
    records = db.get_all_training()
    results = []
    for c in records:
        item = dict(c)
        item["status"] = _evaluate_cert_status(item.get("expiry_date", ""))
        try:
            exp_date = datetime.strptime(item["expiry_date"], "%Y-%m-%d").date()
            item["days_remaining"] = (exp_date - date.today()).days
        except Exception:
            item["days_remaining"] = 999
        results.append(item)
    return results

@app.post("/api/training")
def create_training_certification(data: TrainingCertificationCreate):
    officer = db.get_personnel_by_id(data.personnel_id)
    officer_name = officer["name"] if officer else "Unknown Officer"

    training_list = db.get_all_training()
    cert_id = f"CERT-2026-{len(training_list) + 1:03d}"
    cert_num = f"NEG-TC-{random.randint(1000, 9999)}"
    status = _evaluate_cert_status(data.expiry_date)

    record = db.create_training({
        "id": cert_id,
        "cert_number": cert_num,
        "personnel_id": data.personnel_id,
        "name": officer_name,
        "course_title": data.course_title,
        "category": data.category,
        "issuing_authority": data.issuing_authority,
        "issue_date": data.issue_date,
        "expiry_date": data.expiry_date,
        "proficiency_score": data.proficiency_score or "Qualified",
        "status": status,
        "notes": data.notes or "",
    })
    return record

@app.put("/api/training/{id}")
def update_training_certification(id: str, data: TrainingCertificationUpdate):
    record = db.get_training_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Training certification record not found")

    update_payload = {}
    if data.course_title is not None:
        update_payload["course_title"] = data.course_title
    if data.category is not None:
        update_payload["category"] = data.category
    if data.issuing_authority is not None:
        update_payload["issuing_authority"] = data.issuing_authority
    if data.issue_date is not None:
        update_payload["issue_date"] = data.issue_date
    if data.expiry_date is not None:
        update_payload["expiry_date"] = data.expiry_date
        update_payload["status"] = _evaluate_cert_status(data.expiry_date)
    if data.proficiency_score is not None:
        update_payload["proficiency_score"] = data.proficiency_score
    if data.notes is not None:
        update_payload["notes"] = data.notes

    updated = db.update_training(id, update_payload)
    return updated

@app.delete("/api/training/{id}")
def delete_training_certification(id: str):
    record = db.get_training_by_id(id)
    if not record:
        raise HTTPException(status_code=404, detail="Training certification record not found")
    db.delete_training(id)
    return {"success": True, "deleted_id": id}

# -------------------------------------------------------------
# CSV Exporters & Rank Permission Enforcement
# -------------------------------------------------------------
RANK_SENIORITY_MAP = {
    "president": 120,
    "ministry of defense and human rights": 110,
    "minister of defense and human rights": 110,
    "director": 100,
    "deputy director": 90,
    "master sergeant": 80,
    "staff sergeant": 70,
    "sergeant": 60,
    "senior corporal": 50,
    "corporal": 40,
    "senior officer ii": 30,
    "senior officer i": 20,
    "officer ii": 10,
    "officer i": 5,
}

def get_user_rank_level(user: dict) -> int:
    rank_norm = (user.get("rank") or "").strip().lower()
    lvl = RANK_SENIORITY_MAP.get(rank_norm, 0)
    if user.get("role") == "ADMIN" and lvl == 0:
        return 100
    return lvl

def check_can_access_letters(user: dict) -> bool:
    # Disciplinary & official letters restricted to users with admin role (rank master sergeant to director / executive)
    role = user.get("role")
    lvl = get_user_rank_level(user)
    return role == "ADMIN" and lvl >= 80

def require_export_permission(
    module: str, 
    authorization: Optional[str] = Header(default=None), 
    token: Optional[str] = Query(default=None)
):
    auth_token = None
    if authorization:
        scheme, _, t = authorization.partition(" ")
        if scheme.lower() == "bearer":
            auth_token = t
        else:
            auth_token = authorization
    if not auth_token and token:
        auth_token = token

    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication token required to export CSV data")

    user_id = ACTIVE_AUTH_TOKENS.get(auth_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid active security token required")
    
    user = db.get_user_by_id(user_id)
    if not user or user["status"] == "Disbanded":
        raise HTTPException(status_code=403, detail="Security clearance account has been disbanded by High Command. Access denied.")

    user_level = get_user_rank_level(user)

    # Rule 1: Someone ranked below Sergeant (< 60) cannot export CSV data
    if user_level < 60:
        raise HTTPException(
            status_code=403, 
            detail=f"Permission Denied: Minimum rank of Sergeant required to export data to CSV (Current rank: {user.get('rank', 'Unknown')})."
        )

    # Rule 2: Someone ranked below Master Sergeant (< 80) cannot export payroll data
    if module == "payroll" and user_level < 80:
        raise HTTPException(
            status_code=403,
            detail=f"Permission Denied: Minimum rank of Master Sergeant required to export payroll data to CSV (Current rank: {user.get('rank', 'Unknown')})."
        )

    # Rule 3: Disciplinary letters export restricted to Admin role with rank Master Sergeant to Director
    if module == "letters" and not check_can_access_letters(user):
        raise HTTPException(
            status_code=403,
            detail="Permission Denied: Disciplinary & official letters restricted to administrators with rank Master Sergeant to Director."
        )

    return user

@app.get("/api/export/{module}")
def export_csv(
    module: str,
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None)
):
    require_export_permission(module, authorization=authorization, token=token)
    output = io.StringIO()
    output.write('\ufeff')
    writer = csv.writer(output)

    if module == "presence":
        writer.writerow(["Date", "Shift", "Name", "Badge ID", "Time In", "Time Out", "Duration (Hours)", "Duration (Minutes)", "Escort Count"])
        for p in db.get_all_presence():
            record = _presence_response(p)
            writer.writerow([record["date"], record["shift"], record["name"], record["badge_id"], record["time_in"], record["time_out"] or "", record["duration_hours"] if record["duration_hours"] is not None else "", record["duration_minutes"] if record["duration_minutes"] is not None else "", record["escort_count"]])
        filename = f"NEG_Presence_Record_{date.today()}.csv"

    elif module == "payroll":
        writer.writerow(["Name", "Rank", "Salary", "Salary Date", "Week Number"])
        for r in db.get_all_payroll():
            writer.writerow([r["name"], r["rank"], r["salary"], r["salary_date"], r["week_number"]])
        filename = f"NEG_Payroll_Record_{date.today()}.csv"

    elif module == "armory":
        writer.writerow(["Item ID", "Restock Date", "Name", "Item Type", "Item", "Serial Number", "Quantity", "Condition", "Status", "Assigned To", "Issue Date", "Expected Return"])
        for a in db.get_all_armory():
            writer.writerow([
                a["id"], 
                a.get("restock_date", "--"), 
                a.get("name", "--"), 
                a.get("item_type", "--"), 
                a.get("item", "--"), 
                a.get("serial_number", "--"), 
                a.get("quantity", 1), 
                a.get("condition", "--"), 
                a.get("status", "--"), 
                a.get("assigned_to", "--"), 
                a.get("issue_date", "--"), 
                a.get("expected_return", "--")
            ])
        filename = f"NEG_Armory_Allocation_{date.today()}.csv"

    elif module == "escort":
        writer.writerow(["Mission ID", "Principal", "Threat Level", "Mission Type", "Origin", "Destination", "Lead Agent", "Convoy", "Start Time", "Status", "Notes"])
        for m in db.get_all_escort_missions():
            writer.writerow([m["id"], m["principal"], m["threat_level"], m["mission_type"], m["origin"], m["destination"], m["lead_agent"], m["vehicle_convoy"], m["start_time"], m["status"], m["notes"]])
        filename = f"NEG_Escort_Missions_{date.today()}.csv"

    elif module == "personnel":
        writer.writerow([
            "Personnel ID", "Badge ID", "Name", "Rank", "Division", "Join Date", "License/Certificate", "Status",
            "Armored Riot Van Plate", "Patrol Motorcycle Plate", "G500 Plate", "Hyundai IONIQ 4 Plate", "Presidential Limo Plate"
        ])
        for p in db.get_all_personnel():
            writer.writerow([
                p["id"], p["badge_id"], p["name"], p["rank"], p.get("division", "Unassigned"), p["join_date"], p["license_certificate"], p["status"],
                p.get("plate_riot_van", ""), p.get("plate_patrol_motorcycle", ""), p.get("plate_g500", ""), p.get("plate_ioniq_4", ""), p.get("plate_presidential_limo", "")
            ])
        filename = f"NEG_Personnel_Roster_{date.today()}.csv"

    elif module == "users":
        writer.writerow(["User ID", "Username", "Personnel ID", "Name", "Rank", "Role", "Status", "Created At", "Created By"])
        for u in db.get_all_users():
            writer.writerow([u["id"], u["username"], u["personnel_id"], u["name"], u["rank"], u["role"], u["status"], u["created_at"], u["created_by"]])
        filename = f"NEG_Security_Users_{date.today()}.csv"

    elif module == "training":
        writer.writerow(["Cert ID", "Cert Number", "Personnel ID", "Agent Name", "Course Title", "Category", "Issuing Authority", "Issue Date", "Expiry Date", "Proficiency Score", "Status", "Notes"])
        for c in db.get_all_training():
            status = _evaluate_cert_status(c.get("expiry_date", ""))
            writer.writerow([
                c["id"],
                c.get("cert_number", ""),
                c.get("personnel_id", ""),
                c.get("name", ""),
                c.get("course_title", ""),
                c.get("category", ""),
                c.get("issuing_authority", ""),
                c.get("issue_date", ""),
                c.get("expiry_date", ""),
                c.get("proficiency_score", ""),
                status,
                c.get("notes", "")
            ])
        filename = f"NEG_Training_Certifications_{date.today()}.csv"

    elif module == "hierarchy":
        writer.writerow(["Tier", "Rank", "Insignia", "Authority", "Clearance", "Officer Name", "Badge ID", "Personnel ID", "Status"])
        all_p = db.get_all_personnel()
        p_by_rank = {}
        for p in all_p:
            p_by_rank.setdefault(p["rank"], []).append(p)

        hierarchy_ranks = [
            ("Tier 1 - Directorate", "Director", "★★★★", "Supreme Commander / High Executive", "Level 5"),
            ("Tier 1 - Directorate", "Deputy Director", "★★★", "Vice Commander / Operations Chief", "Level 4"),
            ("Tier 2 - Senior NCOs", "Master Sergeant", "▲▲▲ ★", "Chief Armorer & Tactical Coordinator", "Level 3"),
            ("Tier 2 - Senior NCOs", "Staff Sergeant", "▲▲▲ ═", "Operations Section Leader", "Level 3"),
            ("Tier 3 - Squad Leaders", "Sergeant", "▲▲▲", "Squad Leader & Convoy Lead", "Level 2"),
            ("Tier 3 - Squad Leaders", "Senior Corporal", "▲▲ ═", "Assistant Squad Leader", "Level 2"),
            ("Tier 3 - Squad Leaders", "Corporal", "▲▲", "Team Leader", "Level 2"),
            ("Tier 4 - Specialists", "Senior Officer II", "❙❙", "Senior Close Protection Specialist", "Level 1"),
            ("Tier 4 - Specialists", "Senior Officer I", "❙", "Senior Perimeter Specialist", "Level 1"),
            ("Tier 5 - Field Officers", "Officer II", "—", "Operational Security Guard II", "Level 1"),
            ("Tier 5 - Field Officers", "Officer I", "·", "Probationary / Guard I", "Level 0"),
        ]

        for tier, rank_name, insignia, authority, clearance in hierarchy_ranks:
            assigned = p_by_rank.get(rank_name, [])
            if assigned:
                for o in assigned:
                    writer.writerow([tier, rank_name, insignia, authority, clearance, o["name"], o["badge_id"], o["id"], o["status"]])
            else:
                writer.writerow([tier, rank_name, insignia, authority, clearance, "VACANT", "--", "--", "--"])
    elif module == "letters":
        writer.writerow(["Letter ID", "Letter Number", "Letter Type", "Personnel ID", "Recipient Name", "Badge ID", "Rank", "Issue Date", "Effective Date", "Violation Category", "Severity", "Incident Summary", "Sanctions", "Authorized By", "Status", "Notes"])
        for l in db.get_all_letters():
            writer.writerow([
                l["id"], l["letter_number"], l["letter_type"], l["personnel_id"],
                l["recipient_name"], l.get("badge_id", ""), l.get("rank", ""),
                l["issue_date"], l["effective_date"], l["violation_category"],
                l["severity"], l["incident_summary"], l["sanctions"],
                l["authorized_by"], l["status"], l.get("notes", "")
            ])
        filename = f"NEG_Disciplinary_Letters_{date.today()}.csv"
    elif module == "infractions":
        writer.writerow(["Infraction ID", "Date", "Personnel ID", "Recipient Name", "Badge ID", "Rank", "Code", "Category", "Title", "Points", "Status", "Decay Date", "Issued By", "Description"])
        for inf in db.get_all_infractions():
            writer.writerow([
                inf["id"], inf["incident_date"], inf["personnel_id"], inf["recipient_name"],
                inf.get("badge_id", "-"), inf.get("rank", "-"), inf["infraction_code"],
                inf["category"], inf["title"], inf["points"], inf["status"],
                inf.get("decay_date", "-"), inf["issued_by"], inf["description"]
            ])
        filename = f"NEG_Infractions_Ledger_{date.today()}.csv"
    elif module == "vehicles":
        writer.writerow(["Vehicle ID", "Model", "Plate Number", "Assigned Officer", "Badge ID", "Personnel ID", "Division", "Status", "Date Assigned", "Notes"])
        for v in db.get_all_vehicles():
            writer.writerow([
                v["id"],
                v["model"],
                v["plate_number"],
                v.get("assigned_to", "Unassigned / Motor Pool"),
                v.get("badge_id", "-"),
                v.get("personnel_id", "-"),
                v.get("division", "Motor Pool"),
                v.get("status", "Available"),
                v.get("assigned_date", "-"),
                v.get("notes", "")
            ])
        filename = f"NEG_Department_Vehicles_{date.today()}.csv"

    else:
        raise HTTPException(status_code=400, detail="Invalid module name for export")

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# -------------------------------------------------------------
# Hierarchy Custom State Endpoints
# -------------------------------------------------------------
class HierarchySaveRequest(BaseModel):
    tree: dict
    updated_by: Optional[str] = "Admin"

@app.get("/api/hierarchy")
def get_hierarchy_state():
    tree = db.get_hierarchy_tree()
    return {
        "tree": tree,
        "has_custom": tree is not None
    }

@app.post("/api/hierarchy")
def save_hierarchy_state(data: HierarchySaveRequest):
    saved = db.save_hierarchy_tree(data.tree, data.updated_by or "Admin")
    return {
        "status": "success",
        "tree": saved
    }

@app.post("/api/hierarchy/reset")
def reset_hierarchy_state():
    db.reset_hierarchy_tree()
    return {
        "status": "reset",
        "tree": None
    }

# -------------------------------------------------------------
# Disciplinary Decrees & Letters Endpoints
# -------------------------------------------------------------

@app.get("/api/letters")
def get_disciplinary_letters(user: dict = Depends(require_authenticated_user)):
    if not check_can_access_letters(user):
        raise HTTPException(status_code=403, detail="Access denied: Disciplinary & official letters are restricted to administrators with rank Master Sergeant to Director.")
    return db.get_all_letters()

@app.post("/api/letters")
def create_disciplinary_letter(data: LetterCreateRequest, user: dict = Depends(require_authenticated_user)):
    if not check_can_access_letters(user):
        raise HTTPException(status_code=403, detail="Access denied: Only administrators with rank Master Sergeant to Director can issue disciplinary letters.")
    
    officer = db.get_personnel_by_id(data.personnel_id)
    recipient_name = officer["name"] if officer else "Unknown Personnel"
    badge_id = officer.get("badge_id", "-") if officer else "-"
    rank = officer.get("rank", "-") if officer else "-"

    all_letters = db.get_all_letters()
    letter_id = f"DIS-2026-{len(all_letters) + 1:03d}"

    if not data.letter_number or not data.letter_number.strip():
        prefix = "WARN-1" if ("1" in data.letter_type or "First" in data.letter_type) else (
            "WARN-2" if ("2" in data.letter_type or "Second" in data.letter_type) else (
                "WARN-3" if ("3" in data.letter_type or "Final" in data.letter_type) else "TERM"
            )
        )
        ref_num = f"NEG/CMD/{prefix}/2026/{len(all_letters) + 1:03d}"
    else:
        ref_num = data.letter_number.strip()

    record = db.create_letter({
        "id": letter_id,
        "letter_number": ref_num,
        "letter_type": data.letter_type,
        "personnel_id": data.personnel_id,
        "recipient_name": recipient_name,
        "badge_id": badge_id,
        "rank": rank,
        "issue_date": data.issue_date,
        "effective_date": data.effective_date,
        "violation_category": data.violation_category,
        "severity": data.severity,
        "incident_summary": data.incident_summary,
        "sanctions": data.sanctions,
        "authorized_by": data.authorized_by,
        "status": "Active",
        "notes": data.notes or "",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    return record

@app.patch("/api/letters/{lid}/status")
def update_disciplinary_letter_status(lid: str, data: LetterStatusUpdateRequest, user: dict = Depends(require_authenticated_user)):
    if not check_can_access_letters(user):
        raise HTTPException(status_code=403, detail="Access denied: Only administrators with rank Master Sergeant to Director can update disciplinary letters.")
    letter = db.get_letter_by_id(lid)
    if not letter:
        raise HTTPException(status_code=404, detail="Disciplinary letter not found")
    updated = db.update_letter_status(lid, data.status, data.notes)
    return updated

@app.delete("/api/letters/{lid}")
def delete_disciplinary_letter(lid: str, user: dict = Depends(require_authenticated_user)):
    if not check_can_access_letters(user):
        raise HTTPException(status_code=403, detail="Access denied: Only administrators with rank Master Sergeant to Director can delete disciplinary letters.")
    letter = db.get_letter_by_id(lid)
    if not letter:
        raise HTTPException(status_code=404, detail="Disciplinary letter not found")
    db.delete_letter(lid)
    return {"success": True, "deleted_id": lid}


# -------------------------------------------------------------
# Infraction Point System Endpoints (SS-SOP-ETH-001)
# -------------------------------------------------------------

class InfractionCreateRequest(BaseModel):
    personnel_id: str
    infraction_code: str
    category: str
    title: str
    points: int
    description: str
    location: Optional[str] = ""
    incident_date: str
    notes: Optional[str] = ""
    decay_days: Optional[int] = None

class InfractionStatusUpdateRequest(BaseModel):
    status: Literal["Active", "Decayed", "Revoked", "Appealed"]
    notes: Optional[str] = None

@app.get("/api/infractions")
def get_infractions(
    personnel_id: Optional[str] = None,
    user: dict = Depends(require_authenticated_user)
):
    # Admin check: user with admin role (rank master sergeant to director/executive)
    is_admin = check_can_access_letters(user) or user.get("role") == "ADMIN"
    
    if is_admin:
        if personnel_id:
            items = db.get_infractions_by_personnel(personnel_id)
        else:
            items = db.get_all_infractions()
        summaries = db.get_all_personnel_infraction_summaries()
        my_summary = next((s for s in summaries if s["personnel_id"] == user.get("personnel_id")), None)
        return {
            "is_admin_view": True,
            "infractions": items,
            "summaries": summaries,
            "my_summary": my_summary,
            "catalog": db.STANDARD_INFRACTION_CATALOG
        }

    # Regular officers can ONLY see their own points
    my_pid = user.get("personnel_id")
    if not my_pid:
        p = db.get_personnel_by_name(user.get("name", ""))
        my_pid = p["id"] if p else None

    if not my_pid:
        return {
            "is_admin_view": False,
            "infractions": [],
            "summaries": [],
            "my_summary": {
                "personnel_id": "UNKNOWN",
                "name": user.get("name", "Officer"),
                "badge_id": "-",
                "rank": user.get("rank", "Officer I"),
                "status": user.get("status", "Active"),
                "division": "Unassigned",
                "active_points": 0,
                "total_records": 0,
                "active_records_count": 0,
                "decayed_records_count": 0,
                "threshold_info": db.get_threshold_info(0)
            },
            "catalog": db.STANDARD_INFRACTION_CATALOG
        }

    items = db.get_infractions_by_personnel(my_pid)
    my_summary = db.get_single_personnel_infraction_summary(my_pid)
    return {
        "is_admin_view": False,
        "infractions": items,
        "summaries": [my_summary] if my_summary else [],
        "my_summary": my_summary,
        "catalog": db.STANDARD_INFRACTION_CATALOG
    }

@app.post("/api/infractions")
def create_infraction_entry(data: InfractionCreateRequest, user: dict = Depends(require_authenticated_user)):
    is_admin = check_can_access_letters(user) or user.get("role") == "ADMIN"
    if not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Restricted action: Only administrators (rank Master Sergeant to Director) can adjudicate or assign infraction points."
        )
    
    officer = db.get_personnel_by_id(data.personnel_id)
    recipient_name = officer["name"] if officer else "Unknown Personnel"
    badge_id = officer.get("badge_id", "-") if officer else "-"
    rank = officer.get("rank", "-") if officer else "-"

    all_infractions = db.get_all_infractions()
    inf_id = f"INF-2026-{len(all_infractions) + 1:03d}"

    # Calculate decay date if applicable
    decay_date = None
    decay_days = data.decay_days
    if decay_days is None:
        cat_match = next((c for c in db.STANDARD_INFRACTION_CATALOG if c["code"] == data.infraction_code), None)
        if cat_match and cat_match.get("default_decay_days", 0) > 0:
            decay_days = cat_match["default_decay_days"]
    
    if decay_days and decay_days > 0:
        try:
            inc_dt = datetime.strptime(data.incident_date, "%Y-%m-%d").date()
            decay_date = (inc_dt + timedelta(days=decay_days)).isoformat()
        except Exception:
            decay_date = (date.today() + timedelta(days=decay_days)).isoformat()

    issuer_title = f"{user.get('name', 'Admin')} ({user.get('rank', 'Command')})"
    created = db.create_infraction({
        "id": inf_id,
        "personnel_id": data.personnel_id,
        "recipient_name": recipient_name,
        "badge_id": badge_id,
        "rank": rank,
        "infraction_code": data.infraction_code,
        "category": data.category,
        "title": data.title,
        "points": data.points,
        "description": data.description,
        "location": data.location or "",
        "incident_date": data.incident_date,
        "issued_by": issuer_title,
        "status": "Active",
        "decay_date": decay_date,
        "notes": data.notes or "",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

    # Return created record plus fresh officer summary
    summary = db.get_single_personnel_infraction_summary(data.personnel_id)
    return {"success": True, "record": created, "summary": summary}

@app.patch("/api/infractions/{iid}/status")
def update_infraction_entry_status(iid: str, data: InfractionStatusUpdateRequest, user: dict = Depends(require_authenticated_user)):
    is_admin = check_can_access_letters(user) or user.get("role") == "ADMIN"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Restricted action: Only administrators can update infraction status.")
    
    record = db.get_infraction_by_id(iid)
    if not record:
        raise HTTPException(status_code=404, detail="Infraction record not found")
    
    updated = db.update_infraction_status(iid, data.status, data.notes)
    summary = db.get_single_personnel_infraction_summary(record["personnel_id"])
    return {"success": True, "record": updated, "summary": summary}

@app.delete("/api/infractions/{iid}")
def delete_infraction_entry(iid: str, user: dict = Depends(require_authenticated_user)):
    is_admin = check_can_access_letters(user) or user.get("role") == "ADMIN"
    if not is_admin:
        raise HTTPException(status_code=403, detail="Restricted action: Only administrators can delete infraction records.")
    
    record = db.get_infraction_by_id(iid)
    if not record:
        raise HTTPException(status_code=404, detail="Infraction record not found")
    
    pid = record["personnel_id"]
    db.delete_infraction(iid)
    summary = db.get_single_personnel_infraction_summary(pid)
    return {"success": True, "deleted_id": iid, "summary": summary}


# -------------------------------------------------------------
# Tactical Operations & Dispatch Chat Endpoints
# -------------------------------------------------------------

class ChatMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    message_type: Optional[Literal["Standard", "SITREP", "Priority", "Alert"]] = "Standard"

@app.get("/api/chat/messages")
def get_chat_history(user: dict = Depends(require_authenticated_user)):
    return db.get_chat_messages(limit=60)

@app.post("/api/chat/messages")
def send_chat_message(data: ChatMessageCreate, user: dict = Depends(require_authenticated_user)):
    all_msgs = db.get_chat_messages(limit=1000)
    mid = f"MSG-2026-{len(all_msgs) + 1:04d}"
    
    badge_id = "-"
    if user.get("personnel_id"):
        p = db.get_personnel_by_id(user["personnel_id"])
        if p:
            badge_id = p.get("badge_id", "-")
    
    created = db.create_chat_message({
        "id": mid,
        "user_id": user.get("id"),
        "personnel_id": user.get("personnel_id"),
        "sender_name": user.get("name", "Unknown Operator"),
        "sender_rank": user.get("rank", "Officer I"),
        "sender_role": user.get("role", "OFFICER"),
        "badge_id": badge_id,
        "message": data.message.strip(),
        "message_type": data.message_type or "Standard",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    return created

@app.delete("/api/chat/messages/{mid}")
def delete_chat_msg(mid: str, user: dict = Depends(require_authenticated_user)):
    msg = db.get_chat_message_by_id(mid)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    is_admin = (user.get("role") == "ADMIN" and get_user_rank_level(user) >= 80) or user.get("role") == "ADMIN"
    is_author = (msg.get("user_id") == user.get("id"))
    
    if not (is_admin or is_author):
        raise HTTPException(status_code=403, detail="Permission Denied: Only message author or Command Admin can delete transmissions.")
    
    db.delete_chat_message(mid)
    return {"success": True, "deleted_id": mid}

# -------------------------------------------------------------
# Resignation Proposals & Executive Discharge Endpoints
# -------------------------------------------------------------

@app.get("/api/resignations")
def get_resignation_proposals(user: dict = Depends(require_authenticated_user)):
    return db.get_all_resignation_proposals()

@app.post("/api/resignations")
def submit_resignation_proposal(data: ResignationProposalCreate, user: dict = Depends(require_authenticated_user)):
    p = db.get_personnel_by_id(data.personnel_id)
    if not p:
        raise HTTPException(status_code=404, detail="Personnel record not found")
    
    if p["status"] == "Disbanded":
        raise HTTPException(status_code=400, detail="Officer is already marked as Disbanded / Discharged")
        
    # Check if there is already a Pending proposal for this personnel
    existing_pending = db.get_pending_resignation_by_personnel_id(data.personnel_id)
    if existing_pending:
        raise HTTPException(
            status_code=400, 
            detail=f"Personnel already has a pending resignation proposal ({existing_pending['proposal_number']}) awaiting High Command review."
        )
        
    all_props = db.get_all_resignation_proposals()
    prop_id = f"RES-{len(all_props) + 1:03d}"
    prop_num = f"NEG/RES/{date.today().year}/{len(all_props) + 1:03d}"
    
    created = db.create_resignation_proposal({
        "id": prop_id,
        "proposal_number": prop_num,
        "personnel_id": p["id"],
        "officer_name": p["name"],
        "badge_id": p["badge_id"],
        "rank": p["rank"],
        "division": p.get("division", "Unassigned"),
        "submission_date": date.today().isoformat(),
        "effective_date": data.effective_date,
        "reason_category": data.reason_category,
        "reason_details": data.reason_details.strip(),
        "handover_notes": (data.handover_notes or "").strip(),
        "status": "Pending",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    return created

@app.post("/api/resignations/{prop_id}/review")
def review_resignation_proposal(
    prop_id: str, 
    data: ResignationReviewRequest, 
    user: dict = Depends(require_authenticated_user)
):
    # Strict Authorization: Only Deputy Director and Director
    user_rank = (user.get("rank") or "").strip().lower()
    allowed_ranks = [
        "director", 
        "deputy director", 
        "president", 
        "ministry of defense and human rights", 
        "minister of defense and human rights"
    ]
    if user_rank not in allowed_ranks:
        raise HTTPException(
            status_code=403, 
            detail="Authorization Denied: Only the Director and Deputy Director are legally empowered to review and approve resignation proposals."
        )

    prop = db.get_resignation_proposal_by_id(prop_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Resignation proposal not found")

    if prop["status"] != "Pending":
        raise HTTPException(
            status_code=400, 
            detail=f"This proposal has already been marked as '{prop['status']}' and cannot be reviewed again."
        )

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    reviewed = db.review_resignation_proposal(
        proposal_id=prop["id"],
        status=data.status,
        reviewed_by=user.get("name", "High Command"),
        reviewed_by_rank=user.get("rank", "Director"),
        review_notes=(data.review_notes or "").strip(),
        review_date=now_str
    )

    # If approved -> execute formal personnel discharge
    if data.status == "Approved":
        db.discharge_personnel_resignation(prop["personnel_id"])

    return reviewed

@app.post("/api/resignations/{prop_id}/withdraw")
def withdraw_resignation_proposal(prop_id: str, user: dict = Depends(require_authenticated_user)):
    prop = db.get_resignation_proposal_by_id(prop_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Resignation proposal not found")

    if prop["status"] != "Pending":
        raise HTTPException(status_code=400, detail="Only pending resignation proposals can be withdrawn.")

    is_author = (user.get("personnel_id") == prop["personnel_id"])
    user_rank = (user.get("rank") or "").strip().lower()
    is_executive = user_rank in ["director", "deputy director", "president"]

    if not (is_author or is_executive):
        raise HTTPException(
            status_code=403, 
            detail="Permission Denied: Only the submitting officer or High Command can withdraw this proposal."
        )

    withdrawn = db.withdraw_resignation_proposal(prop["id"])
    return withdrawn

# -------------------------------------------------------------
# Reinstatement Appeals Endpoints (Accessible ONLY by Disbanded Units)
# -------------------------------------------------------------

@app.post("/api/reinstatements/submit")
def submit_reinstatement_appeal(data: ReinstatementRequestCreate):
    # Verify user credentials
    user = db.get_user_by_username(data.username)
    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Authentication failed: Invalid username or password for appeal verification.")

    # Strictly verify that user is Disbanded
    if user["status"] != "Disbanded":
        raise HTTPException(
            status_code=400, 
            detail="Access Denied: Reinstatement appeal feature is strictly accessible only by Disbanded personnel units."
        )

    # Check if user already has a pending reinstatement appeal
    existing = db.get_pending_reinstatement_by_user_id(user["id"])
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"You already have a pending reinstatement appeal ({existing['request_number']}) awaiting High Command review."
        )

    # Fetch corresponding personnel record if available
    pid = user.get("personnel_id") or ""
    p = db.get_personnel_by_id(pid) if pid else None

    all_reqs = db.get_all_reinstatement_requests()
    req_number = f"RST-{len(all_reqs) + 1:03d}"
    req_id = f"RST-ID-{uuid.uuid4().hex[:8].upper()}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    created = db.create_reinstatement_request({
        "id": req_id,
        "request_number": req_number,
        "user_id": user["id"],
        "username": user["username"],
        "personnel_id": pid,
        "officer_name": user.get("name") or (p.get("name") if p else user["username"]),
        "badge_id": p.get("badge_id", "-") if p else "-",
        "prior_rank": user.get("rank") or (p.get("rank") if p else "Officer I"),
        "prior_division": p.get("division", "Unassigned") if p else "Unassigned",
        "appeal_reason": data.appeal_reason.strip(),
        "commitment_statement": data.commitment_statement.strip(),
        "status": "Pending",
        "created_at": now_str
    })
    return created

@app.get("/api/reinstatements")
def get_reinstatement_requests(user: dict = Depends(require_authenticated_user)):
    user_rank = (user.get("rank") or "").strip().lower()
    is_command = user_rank in ["director", "deputy director", "master sergeant", "commander"] or user.get("role") == "ADMIN"
    if not is_command:
        raise HTTPException(status_code=403, detail="Access Denied: High Command authorization required.")
    return db.get_all_reinstatement_requests()

@app.post("/api/reinstatements/{req_id}/review")
def review_reinstatement_request_endpoint(
    req_id: str,
    data: ReinstatementReviewRequest,
    user: dict = Depends(require_authenticated_user)
):
    user_rank = (user.get("rank") or "").strip().lower()
    allowed_ranks = ["director", "deputy director", "president"]
    if user_rank not in allowed_ranks:
        raise HTTPException(
            status_code=403,
            detail="Authorization Denied: Only the Director and Deputy Director are legally empowered to review and approve reinstatement appeals."
        )

    req = db.get_reinstatement_request_by_id(req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Reinstatement appeal not found")

    if req["status"] != "Pending":
        raise HTTPException(status_code=400, detail=f"This appeal has already been marked as '{req['status']}'.")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    reviewed = db.review_reinstatement_request(
        req_id=req["id"],
        status=data.status,
        reviewed_by=user.get("name", "High Command"),
        reviewed_by_rank=user.get("rank", "Director"),
        review_notes=(data.review_notes or "").strip(),
        review_date=now_str
    )

    if data.status == "Approved":
        db.reinstate_disbanded_personnel(req["user_id"], req["personnel_id"])

    return reviewed




