import argparse
import os
import sys

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow library is not installed. Please install it using 'pip install Pillow'")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Split an image into slices.")
    parser.add_argument("--row", type=int, help="Number of rows")
    parser.add_argument("--column", type=int, help="Number of columns")
    parser.add_argument("--width", type=int, help="Width of each slice")
    parser.add_argument("--height", type=int, help="Height of each slice")
    parser.add_argument("--out-dir", type=str, required=True, help="Output directory")
    parser.add_argument("image_path", type=str, help="Path to the source image")
    
    args = parser.parse_args()

    if not os.path.isfile(args.image_path):
        print(f"Error: image file '{args.image_path}' does not exist.")
        sys.exit(1)

    os.makedirs(args.out_dir, exist_ok=True)

    try:
        img = Image.open(args.image_path)
    except Exception as e:
        print(f"Error opening image: {e}")
        sys.exit(1)

    width, height = img.size
    
    if args.row and args.column:
        rows = args.row
        columns = args.column
        slice_width = width // columns
        slice_height = height // rows
    elif args.width and args.height:
        slice_width = args.width
        slice_height = args.height
        columns = width // slice_width
        rows = height // slice_height
    else:
        print("Error: Must provide either --row and --column, OR --width and --height.")
        sys.exit(1)

    basename = os.path.basename(args.image_path)
    filename, ext = os.path.splitext(basename)
    
    count = 1
    for r in range(rows):
        for c in range(columns):
            left = c * slice_width
            upper = r * slice_height
            right = left + slice_width
            lower = upper + slice_height
            
            box = (left, upper, right, lower)
            slice_img = img.crop(box)
            
            out_filename = f"{filename}_{count}{ext}"
            out_filepath = os.path.join(args.out_dir, out_filename)
            
            slice_img.save(out_filepath)
            print(f"Saved {out_filepath}")
            count += 1

if __name__ == "__main__":
    main()
