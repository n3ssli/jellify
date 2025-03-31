#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install it first."
    exit 1
fi

# Set directory variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"
DIST_DIR="$PROJECT_ROOT/dist"
APP_NAME="Jellify"

# Ask user for installation directory
read -p "Enter installation directory (default: $HOME/.local/share/jellify): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$HOME/.local/share/jellify}
APP_EXEC="$INSTALL_DIR/jellify"
ICON_PATH="$PROJECT_ROOT/logo.png"
DESKTOP_FILE="$HOME/.local/share/applications/jellify.desktop"

# Build the application
echo "Building $APP_NAME..."
cd "$PROJECT_ROOT"
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "Build failed. Exiting."
    exit 1
fi

# Create installation directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"

# Copy built files to installation directory
echo "Installing to $INSTALL_DIR..."
cp -r "$BUILD_DIR"/* "$INSTALL_DIR"
cp "$DIST_DIR"/*.AppImage "$INSTALL_DIR/jellify"
chmod +x "$INSTALL_DIR/jellify"

# Create desktop entry
echo "Creating desktop shortcut..."
mkdir -p "$HOME/.local/share/applications"
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
GenericName=Music Player
Comment=A Jellyfin music player with Spotify-like UI
Exec=$APP_EXEC
Icon=$INSTALL_DIR/logo.png
Terminal=false
Categories=Audio;Music;Player;AudioVideo;
Keywords=music;player;jellyfin;
StartupWMClass=jellify
EOF

# Copy icon
cp "$ICON_PATH" "$INSTALL_DIR/logo.png"

# Update desktop database
update-desktop-database "$HOME/.local/share/applications"

echo "$APP_NAME has been installed successfully!"
echo "You can run it from your application menu"

echo "Installation complete!" 