# add_challenges.py
import requests
import json
import os
import time

# CTF Challenge Server API URL and admin credentials
CTFD_URL = "http://localhost:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password"

# Maximum retries and delay between retries
MAX_RETRIES = 5
RETRY_DELAY = 10  # seconds

# Login to CTF Challenge Server and get API token
def login():
    url = f"{CTFD_URL}/login"
    data = {
        "name": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    }
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(url, data=data)
            if response.status_code == 200:
                return response.cookies
            else:
                print(f"Login attempt {attempt + 1} failed. Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
        except requests.exceptions.RequestException as e:
            print(f"Connection error during login: {e}. Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)
    raise Exception("Failed to log in to CTFd after multiple attempts")

# Add a challenge to CTF Challenge Servrer
def add_challenge(cookies, name, description, flags, hints):
    url = f"{CTFD_URL}/api/v1/challenges"
    data = {
        "name": name,
        "description": description,
        "value": 100,  # Default point value
        "category": "Web",  # Default category
        "state": "visible",
        "type": "standard",
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(url, json=data, cookies=cookies, headers=headers)
            if response.status_code == 200:
                challenge_id = response.json()["data"]["id"]
                # Add flags
                for flag in flags:
                    flag_url = f"{CTFD_URL}/api/v1/flags"
                    flag_data = {
                        "challenge_id": challenge_id,
                        "content": flag,
                        "type": "static",
                    }
                    response = requests.post(flag_url, json=flag_data, cookies=cookies, headers=headers)
                    if response.status_code != 200:
                        print(f"Failed to add flag: {response.text}")
                # Add hints
                for hint in hints:
                    hint_url = f"{CTFD_URL}/api/v1/hints"
                    hint_data = {
                        "challenge_id": challenge_id,
                        "content": hint,
                        "cost": 10,  # Default hint cost
                    }
                    response = requests.post(hint_url, json=hint_data, cookies=cookies, headers=headers)
                    if response.status_code != 200:
                        print(f"Failed to add hint: {response.text}")
                return
            else:
                print(f"Challenge creation attempt {attempt + 1} failed. Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
        except requests.exceptions.RequestException as e:
            print(f"Connection error during challenge creation: {e}. Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)
    raise Exception(f"Failed to add challenge after multiple attempts: {response.text}")

# Main function
def main():
    # Login to CTF Challenge Server
    cookies = login()

    # Add challenges from the challenges directory
    for i in range(1, 5):
        challenge_dir = f"challenges/ctf_challenge_0{i}"
        with open(f"{challenge_dir}/story.txt", "r") as f:
            description = f.read()
        with open(f"{challenge_dir}/flags.txt", "r") as f:
            flags = [line.strip() for line in f.readlines()]
        with open(f"{challenge_dir}/hints.txt", "r") as f:
            hints = [line.strip() for line in f.readlines()]

        # Add challenge to CTF Challenge Server
        add_challenge(cookies, f"Challenge {i}", description, flags, hints)
        print(f"Added Challenge {i}")

if __name__ == "__main__":
    main()
