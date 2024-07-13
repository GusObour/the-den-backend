# Use the official Nix base image
FROM nixos/nix

# Install a specific Python version (e.g., Python 3.10)
RUN nix-env -iA nixpkgs.python3_10

# Ensure the correct Python version is used
ENV PYTHON=/nix/store/$(nix-env -q --out-path python3_10 | awk '{print $2}')/bin/python3

# Install Node.js and other dependencies
RUN nix-env -iA nixpkgs.nodejs-14_x

# Copy the Nix expression to the container
COPY .nixpacks/nixpkgs-bf744fe90419885eefced41b3e5ae442d732712d.nix .nixpacks/nixpkgs-bf744fe90419885eefced41b3e5ae442d732712d.nix

# Run Nix to install dependencies and collect garbage
RUN nix-env -if .nixpacks/nixpkgs-bf744fe90419885eefced41b3e5ae442d732712d.nix && nix-collect-garbage -d

# Set the working directory
WORKDIR /app

# Copy the application code to the container
COPY . /app

# Install Node.js dependencies
RUN npm install

# Expose the port your app runs on
EXPOSE 3000

# Start the Node.js application
CMD ["node", "server.js"]
