import argparse
import os
import glob
import re
from PIL import Image

def main():
    parser = argparse.ArgumentParser(description="Merge image slices into a single sprite sheet.")
    parser.add_argument("--row", type=int, required=True, help="Number of rows")
    parser.add_argument("--column", type=int, required=True, help="Number of columns")
    parser.add_argument("--input-dir", type=str, required=True, help="Input directory")
    parser.add_argument("--input-prefix", type=str, required=False, help="Input file prefix")
    
    args = parser.parse_args()
    
    rows = args.row
    cols = args.column
    max_files = rows * cols
    
    # Try finding files with a glob pattern
    if args.input_prefix:
        search_pattern = os.path.join(args.input_dir, f"{args.input_prefix}*.png")
    else:
        search_pattern = os.path.join(args.input_dir, "*.png")
    matched_files = glob.glob(search_pattern)
    
    # Sort files by their numeric suffix
    def extract_number(filename):
        base = os.path.basename(filename)
        # strip extension
        name_no_ext = os.path.splitext(base)[0]
        
        if args.input_prefix:
            if not name_no_ext.startswith(args.input_prefix):
                return float('inf')
            remainder = name_no_ext[len(args.input_prefix):]
        else:
            remainder = name_no_ext
            
        # extract all numeric sequences
        digits = re.findall(r'\d+', remainder)
        if digits:
            return int(digits[-1]) # take the last number found
        return float('inf')
        
    matched_files.sort(key=extract_number)
    
    # Limit to the requested grid size
    files = matched_files[:max_files]
    
    if not files:
        print(f"No files found matching '{search_pattern}'")
        return
        
    print(f"Found {len(files)} files to merge, expected up to {max_files} files.")
    
    # Open all images
    images = [Image.open(f) for f in files]
    
    # Determine slice dimensions
    # Calculate max width per column and max height per row to handle varying sizes safely
    slice_widths = [0] * cols
    slice_heights = [0] * rows
    
    for idx, img in enumerate(images):
        r = idx // cols
        c = idx % cols
        w, h = img.size
        # The image might have an alpha channel already
        if w > slice_widths[c]:
            slice_widths[c] = w
        if h > slice_heights[r]:
            slice_heights[r] = h
            
    total_width = sum(slice_widths)
    total_height = sum(slice_heights)
    
    # Create the sprite canvas (RGBA to preserve transparency)
    sprite = Image.new('RGBA', (total_width, total_height), (0, 0, 0, 0))
    
    y_offset = 0
    for r in range(rows):
        x_offset = 0
        for c in range(cols):
            idx = r * cols + c
            if idx < len(images):
                img = images[idx]
                sprite.paste(img, (x_offset, y_offset))
            x_offset += slice_widths[c]
        y_offset += slice_heights[r]
        
    # Save the file as {prefix}_sprite.png or based on dir name
    if args.input_prefix:
        output_filename = f"{args.input_prefix}_sprite.png"
    else:
        base_dir_name = os.path.basename(os.path.abspath(args.input_dir))
        output_filename = f"{base_dir_name}_sprite.png"
        
    sprite.save(output_filename)
    print(f"Successfully saved merged sprite to {output_filename}")

if __name__ == "__main__":
    main()
