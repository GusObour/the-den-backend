# Use an official Node.js runtime as a parent image
FROM node:14

# Install a compatible Python version
RUN apt-get update && apt-get install -y python3.10

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files to the container
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port that the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "start"]
