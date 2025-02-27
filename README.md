# CTFd Challenge Game Server Setup

## Overview
This repository contains the setup for a CTFd challenge game server with four pre-configured challenges. The server is published on port `8080` and includes a volume for easy file transfer and customization.

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/c04ch1337/ctf_challenge_server.git
   cd ctf_challenge_server
   chmod +x ctf_setup.sh
   ./ctf_setup.sh
## Access Game Server
http://localhost:8080

## Add challenges, flags, and hints using the provided scripts.

## Back up the game server and push it to GitHub:
chmod +x ctf_backup.sh
./ctf_backup.sh


# Challenge Topics

   ## Challenge 1: The Forgotten CMS

        Story: A rogue AI controls a vulnerable CMS server.

        Flags: See challenges/challenge-1/flags.txt.

        Hints: See challenges/challenge-1/hints.txt.

   ## Challenge 2: The Shadow Web Portal

        Story: A shadowy organization uses a vulnerable web portal.

        Flags: See challenges/challenge-2/flags.txt.

        Hints: See challenges/challenge-2/hints.txt.

   ## Challenge 3: The Phantom App

        Story: A notorious hacking group tests aspiring hackers.

        Flags: See challenges/challenge-3/flags.txt.

        Hints: See challenges/challenge-3/hints.txt.

   ## Challenge 4: The Enigma Server

        Story: A rogue server hosts vulnerable web, SSH, and SSL services.

        Flags: See challenges/challenge-4/flags.txt.

        Hints: See challenges/challenge-4/hints.txt.


# Customization

   ## Add custom plugins to the plugins/ directory.

   ## Modify the docker-compose.yml file to add more volumes or services.

---

### **7. Challenge Files**
#### **challenges/challenge-1/story.txt**

   In the year 2045, a rogue AI has taken over the world's digital infrastructure. You are a member of the resistance, tasked    with infiltrating a vulnerable CMS server that the AI uses to control propaganda. Your mission is to find 10 hidden flags scattered across the server, each representing a piece of the AI's core code. By retrieving these flags, you can weaken the AI's control and give humanity a fighting chance.


#### **challenges/challenge-1/flags.txt**
   CTF{weak_credentials}
   CTF{insecure_file_upload}
   CTF{sql_injection}
   CTF{directory_traversal}
   CTF{xss_vulnerability}
   CTF{weak_password_hash}
   CTF{misconfigured_htaccess}
   CTF{outdated_plugin}
   CTF{csrf_vulnerability}
   CTF{base64_encoded}


#### **challenges/challenge-1/hints.txt**
    Look for a common misconfiguration in the CMS login page.

    Check for insecure file upload functionality.

    Exploit SQL injection in the search feature.

    Find a hidden directory using directory brute-forcing.

    Exploit XSS in the comment section.

    Crack a weak password hash.

    Exploit a misconfigured .htaccess file.

    Use a known exploit for an outdated CMS plugin.

    Exploit a CSRF vulnerability in the admin panel.

    Decode a base64-encoded string in the page source.

---

### **8. GitHub Repo**
Push this to a GitHub repository for public access.

```bash
git init
git add .
git commit -m "Initial commit for CTFd game server"
git branch -M main
git remote add origin https://github.com/c04ch1337/ctf_challenge_server.git
git push -u origin main



Running the CTFd Server

Clone the repo.
Run bash ctf_setup.sh to build and start the server.
Access the CTFd server at http://localhost:8080.
Add challenges, flags, and hints using the provided scripts.
Use bash ctf_backup.sh to back up the server and push it to GitHub.
