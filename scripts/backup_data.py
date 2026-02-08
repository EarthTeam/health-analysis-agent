
import os
import json
import csv
from datetime import datetime
from supabase import create_client, Client

url = "https://syyqtdxcezukxoevtyhd.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXF0ZHhjZXp1a3hvZXZ0eWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjM5NzksImV4cCI6MjA4MzM5OTk3OX0.3QJjsS4PxFk2ciMMVaPSxhoDm3tHaLoWSz5CXgtYEO8"
supabase: Client = create_client(url, key)

def backup():
    print("Fetching data from Supabase...")
    response = supabase.table("daily_entries").select("*").execute()
    data = response.data
    
    if not data:
        print("No data found in Supabase.")
        return

    backup_dir = "/Users/manuelescolano/Documents/APPS/HEALTH APP/DATA BACKUPS"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    timestamp = datetime.now().strftime("%Y-%m-%d")
    json_path = os.path.join(backup_dir, f"recovery-data-{timestamp}.json")
    csv_path = os.path.join(backup_dir, f"recovery-data-{timestamp}.csv")

    # Save JSON
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved JSON to {json_path}")

    # Save CSV
    if data:
        # Map DB keys to CSV headers
        # DB keys: date, m_ready, m_hrv, oura_rec, oura_rhr, oura_hrv, oura_hrv_status, whoop_rec, whoop_rhr, whoop_hrv, steps, fatigue, resistance, joint, notes
        headers = ["Date", "MorpheusReady", "MorpheusHRV", "OuraRecovery", "WhoopRecovery", "WhoopRHR", "OuraRHR", "OuraHRV", "WhoopHRV", "OuraHRVStatus", "Steps", "Fatigue", "Resistance", "JointWarn", "Notes"]
        
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for d in data:
                writer.writerow([
                    d.get("date"),
                    d.get("m_ready"),
                    d.get("m_hrv"),
                    d.get("oura_rec"),
                    d.get("whoop_rec"),
                    d.get("whoop_rhr"),
                    d.get("oura_rhr"),
                    d.get("oura_hrv"),
                    d.get("whoop_hrv"),
                    d.get("oura_hrv_status", ""),
                    d.get("steps"),
                    d.get("fatigue"),
                    d.get("resistance"),
                    d.get("joint"),
                    d.get("notes", "").replace("\n", " ")
                ])
        print(f"Saved CSV to {csv_path}")

if __name__ == "__main__":
    backup()
