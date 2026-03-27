import argparse
import os
import sys
from PIL import Image

def main():
    parser = argparse.ArgumentParser(description="Split an image into slices by width and height.")
    parser.add_argument("--slice-width", type=int, required=True, help="Width of each slice")
    parser.add_argument("--slice-height", type=int, required=True, help="Height of each slice")
    parser.add_argument("--offset-x", type=int, default=0, help="X offset for the first slice")
    parser.add_argument("--offset-y", type=int, default=0, help="Y offset for the first slice")
    parser.add_argument("--padding-x", type=int, default=0, help="Horizontal padding between slices")
    parser.add_argument("--padding-y", type=int, default=0, help="Vertical padding between slices")
    parser.add_argument("--out-dir", type=str, default="tmp", help="Output directory")
    parser.add_argument("image", type=str, help="Path to the input image")

    args = parser.parse_args()

    # Create output directory if it doesn't exist
    os.makedirs(args.out_dir, exist_ok=True)

    # Open the image
    try:
        img = Image.open(args.image)
    except Exception as e:
        print(f"Error opening image '{args.image}': {e}", file=sys.stderr)
        sys.exit(1)

    img_width, img_height = img.size
    slice_width = args.slice_width
    slice_height = args.slice_height

    if slice_width <= 0 or slice_height <= 0:
        print("Error: slice-width and slice-height must be greater than 0.", file=sys.stderr)
        sys.exit(1)

    # Get the base name without extension
    base_name = os.path.splitext(os.path.basename(args.image))[0]
    ext = os.path.splitext(args.image)[1]

    idx = 1
    # Iterate through the image and crop it into slices
    for y in range(args.offset_y + args.padding_y, img_height, slice_height + args.padding_y):
        for x in range(args.offset_x + args.padding_x, img_width, slice_width + args.padding_x):
            # Calculate valid intersection
            valid_right = min(x + slice_width, img_width)
            valid_bottom = min(y + slice_height, img_height)
            
            # Check if out of bounds (skip if the box starts outside the image bounds)
            if x >= img_width or y >= img_height:
                continue
                
            valid_box = (x, y, valid_right, valid_bottom)
            cropped = img.crop(valid_box)
            
            # Fill with pure green if the image bound is exceeded
            if cropped.size[0] < slice_width or cropped.size[1] < slice_height:
                slice_img = Image.new("RGBA", (slice_width, slice_height), (0, 255, 0, 255))
                slice_img.paste(cropped, (0, 0))
            else:
                slice_img = cropped
            
            # Save the slice
            out_path = os.path.join(args.out_dir, f"{base_name}_{idx}{ext}")
            try:
                slice_img.save(out_path)
                print(f"Saved {out_path} at position x={x}, y={y}")
            except Exception as e:
                print(f"Error saving slice {out_path}: {e}", file=sys.stderr)
            
            idx += 1

    print(f"Successfully generated {idx - 1} slices.")

if __name__ == "__main__":
    main()
