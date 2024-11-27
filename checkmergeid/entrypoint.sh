# Use the Node.js image as the base image
FROM node:18-buster

# Install necessary dependencies
RUN apt-get update && apt-get install -y git jq

# Set the working directory in the container
WORKDIR /action

# Copy the action's code into the container
COPY index.js entrypoint.sh ./

# Make sure the entrypoint script is executable
RUN chmod +x entrypoint.sh

# Set the entry point to run the entrypoint.sh script
ENTRYPOINT ["./entrypoint.sh"]
