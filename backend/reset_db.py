import sqlite3

def clean_database():
    conn = sqlite3.connect('neg_security.db')
    cursor = conn.cursor()

    tables_to_clear = [
        'presence',
        'payroll',
        'armory',
        'escort_missions',
        'training_certifications',
        'disciplinary_letters',
        'infractions',
        'chat_messages',
        'resignation_proposals',
        'reinstatement_requests',
        'hierarchy_state'
    ]

    for table in tables_to_clear:
        try:
            cursor.execute(f"DELETE FROM {table};")
            print(f"Cleared table: {table}")
        except Exception as e:
            print(f"Error clearing {table}: {e}")

    # Remove all users except commander
    cursor.execute("DELETE FROM users WHERE username != 'commander';")
    users = cursor.execute("SELECT id, username, role, rank FROM users;").fetchall()
    print(f"Remaining users: {users}")

    # Remove all personnel except NEG-001 (Commander Mikhail Orlov G Romanov)
    cursor.execute("DELETE FROM personnel WHERE id != 'NEG-001';")
    personnel = cursor.execute("SELECT id, name, rank, status FROM personnel;").fetchall()
    print(f"Remaining personnel: {personnel}")

    try:
        cursor.execute("UPDATE depot_stockpiles SET issued = 0;")
        print("Reset depot stockpiles issued count.")
    except Exception as e:
        print(f"Error updating stockpiles: {e}")

    try:
        cursor.execute("UPDATE department_vehicles SET status = 'Available', personnel_id = NULL, assigned_to = 'Unassigned / Motor Pool', badge_id = '-' WHERE personnel_id != 'NEG-001';")
        print("Reset department vehicles.")
    except Exception as e:
        print(f"Error updating department_vehicles: {e}")

    conn.commit()
    print("\nDatabase table row counts:")
    tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    for t in tables:
        count = cursor.execute(f"SELECT count(*) FROM {t};").fetchone()[0]
        print(f"  {t}: {count}")

    conn.close()
    print("\nDatabase cleanup successfully completed.")

if __name__ == '__main__':
    clean_database()
