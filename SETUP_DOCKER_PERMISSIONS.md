# Fix Docker Permission Issues

If you're getting a "permission denied" error when trying to use Docker, follow these steps:

## Quick Fix

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the changes immediately (or log out and log back in)
newgrp docker

# Verify it works
docker ps
```

## What This Does

- Adds your user to the `docker` group, which allows you to run Docker commands without `sudo`
- The `newgrp docker` command applies the group change to your current session
- After this, you should be able to run `docker` and `docker-compose` commands normally

## Verify It Worked

After running the commands above, test with:

```bash
docker ps
docker-compose version
```

If both commands work without errors, you're all set!

## Alternative: Use sudo (Not Recommended)

If you can't add yourself to the docker group, you can use `sudo`:

```bash
sudo docker-compose up -d
```

However, this may cause permission issues with files created by Docker, so adding your user to the docker group is the recommended approach.

