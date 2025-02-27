# Dockerfile
FROM ctfd/ctfd:latest

# Create a directory for custom plugins
RUN mkdir -p /opt/CTFd/plugins

# Copy custom plugins (if any)
COPY plugins/ /opt/CTFd/plugins/

# Expose port 8000 (CTFd default)
EXPOSE 8000

# Start CTFd
CMD ["python", "serve.py"]
