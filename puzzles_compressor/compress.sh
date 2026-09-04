#!/bin/bash

# Define colors for friendly terminal feedback
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN}🚀 BASH PUZZLE GZIP COMPRESSOR                         ${NC}"
echo -e "${CYAN}=====================================================${NC}"

# Navigate to the script's directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

INPUT_FILE="puzzles.txt"
OUTPUT_FILE="puzzles.gz"

if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ Error: Input file '$INPUT_FILE' not found in $DIR.${NC}"
    echo -e "   Please create it with your puzzle data first."
    exit 1
fi

echo -e "⚡ Compressing '$INPUT_FILE' using Gzip (Maximum level 9)..."

# Compress with maximum compression level (-9) and keep the original file (-k / -c redirects to stdout)
gzip -c -9 "$INPUT_FILE" > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
    sz_raw=$(wc -c < "$INPUT_FILE" | xargs)
    sz_gz=$(wc -c < "$OUTPUT_FILE" | xargs)
    reduction=$(( 100 - (sz_gz * 100 / sz_raw) ))

    echo -e "\n📊 ${GREEN}Compression Complete!${NC}"
    echo -e "-----------------------------------------------------"
    echo -e "  - Raw Text Size:        ${YELLOW}${sz_raw} bytes${NC}"
    echo -e "  - Gzipped Size (.gz):   ${GREEN}${sz_gz} bytes${NC}"
    echo -e "  - Net Size Reduction:   ${GREEN}${reduction}%${NC}"
    echo -e "-----------------------------------------------------"
    echo -e "✨ ${GREEN}Saved output file to: $DIR/$OUTPUT_FILE${NC}\n"
else
    echo -e "${RED}❌ Error during compression process.${NC}"
    exit 1
fi
