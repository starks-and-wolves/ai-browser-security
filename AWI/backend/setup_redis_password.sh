#!/bin/bash

# Redis Password Setup Script
# Generates a strong password and configures Redis

set -e

echo "╔════════════════════════════════════════╗"
echo "║   Redis Password Setup                ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Generate strong password (alphanumeric only to avoid sed issues)
echo "Generating secure password..."
PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
echo "✅ Generated password: $PASSWORD"
echo ""

# Backup redis.conf
REDIS_CONF="/opt/homebrew/etc/redis.conf"

if [ ! -f "$REDIS_CONF" ]; then
    echo "❌ Error: redis.conf not found at $REDIS_CONF"
    echo "Please check your Redis installation"
    exit 1
fi

echo "Creating backup of redis.conf..."
cp "$REDIS_CONF" "${REDIS_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"
echo ""

# Update redis.conf
echo "Configuring Redis with password..."

# Check if requirepass already exists
if grep -q "^requirepass" "$REDIS_CONF"; then
    # Replace existing password using awk (safer than sed for special chars)
    awk -v pwd="$PASSWORD" '{if ($1 == "requirepass") print "requirepass " pwd; else print}' "$REDIS_CONF" > "${REDIS_CONF}.tmp"
    mv "${REDIS_CONF}.tmp" "$REDIS_CONF"
    echo "✅ Updated existing password in redis.conf"
else
    # Add new password line
    if grep -q "^# requirepass" "$REDIS_CONF"; then
        # Uncomment and set password
        awk -v pwd="$PASSWORD" '{if ($1 == "#" && $2 == "requirepass") print "requirepass " pwd; else print}' "$REDIS_CONF" > "${REDIS_CONF}.tmp"
        mv "${REDIS_CONF}.tmp" "$REDIS_CONF"
        echo "✅ Enabled password in redis.conf"
    else
        # Add password line
        echo "requirepass $PASSWORD" >> "$REDIS_CONF"
        echo "✅ Added password to redis.conf"
    fi
fi
echo ""

# Update .env file
ENV_FILE=".env"

echo "Updating .env file..."

if [ -f "$ENV_FILE" ]; then
    # Check if REDIS_PASSWORD exists
    if grep -q "^REDIS_PASSWORD=" "$ENV_FILE"; then
        # Update existing password using awk
        awk -v pwd="$PASSWORD" '{if ($0 ~ /^REDIS_PASSWORD=/) print "REDIS_PASSWORD=" pwd; else print}' "$ENV_FILE" > "${ENV_FILE}.tmp"
        mv "${ENV_FILE}.tmp" "$ENV_FILE"
        echo "✅ Updated REDIS_PASSWORD in .env"
    else
        # Add password
        echo "REDIS_PASSWORD=$PASSWORD" >> "$ENV_FILE"
        echo "✅ Added REDIS_PASSWORD to .env"
    fi
else
    echo "⚠️  Warning: .env file not found"
    echo "Please create .env and add:"
    echo "REDIS_PASSWORD=$PASSWORD"
fi
echo ""

# Restart Redis
echo "Restarting Redis..."
brew services restart redis
sleep 2
echo "✅ Redis restarted"
echo ""

# Test connection
echo "Testing Redis connection with password..."
if redis-cli -a "$PASSWORD" ping &>/dev/null; then
    echo "✅ Redis authentication working!"
else
    echo "❌ Redis authentication test failed"
    echo "Please check the configuration"
    exit 1
fi
echo ""

echo "╔════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                  ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Your Redis password has been set to:"
echo "$PASSWORD"
echo ""
echo "This password is now:"
echo "  ✓ Configured in redis.conf"
echo "  ✓ Added to .env file"
echo "  ✓ Active in Redis"
echo ""
echo "Backup saved at:"
echo "  ${REDIS_CONF}.backup.$(date +%Y%m%d)_*"
echo ""
echo "To connect to Redis CLI:"
echo "  redis-cli -a '$PASSWORD'"
echo ""
echo "⚠️  Important: Save this password securely!"
echo "   You can find it in your .env file"
echo ""
