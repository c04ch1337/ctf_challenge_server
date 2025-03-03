# add_challenges.py
import requests
import json
import os

# CTFd API URL and admin credentials
CTFD_URL = "http://localhost:8080"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password"

# Login to CTFd and get API token
def login():
    url = f"{CTFD_URL}/login"
    data = {
        "name": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    }
    response = requests.post(url, data=data)
    if response.status_code != 200:
        raise Exception("Failed to log in to CTFd")
    return response.cookies

# Add a challenge to CTFd
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
    response = requests.post(url, json=data, cookies=cookies, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to add challenge: {response.text}")
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
            raise Exception(f"Failed to add flag: {response.text}")

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
            raise Exception(f"Failed to add hint: {response.text}")

# Main function
def main():
    # Login to CTFd
    cookies = login()

    # Add challenges from the challenges directory
    for i in range(1, 5):
        challenge_dir = f"challenges/challenge_0{i}"
        with open(f"{challenge_dir}/story.txt", "r") as f:
            description = f.read()
        with open(f"{challenge_dir}/flags.txt", "r") as f:
            flags = [line.strip() for line in f.readlines()]
        with open(f"{challenge_dir}/hints.txt", "r") as f:
            hints = [line.strip() for line in f.readlines()]

        # Add challenge to CTFd
        add_challenge(cookies, f"Challenge {i}", description, flags, hints)
        print(f"Added Challenge {i}")

if __name__ == "__main__":
    main()
