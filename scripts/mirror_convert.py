import sys
import os
from PIL import Image

def mirror_image(image_path):
    if not os.path.isfile(image_path):
        print(f"Error: File not found - {image_path}")
        sys.exit(1)
    
    try:
        with Image.open(image_path) as img:
            # Flip horizontally
            mirrored_img = img.transpose(Image.FLIP_LEFT_RIGHT)
            
            # Save the result
            file_name, file_ext = os.path.splitext(image_path)
            output_path = f"{file_name}_mirrored{file_ext}"
            mirrored_img.save(output_path)
            print(f"Successfully mirrored image. Saved to {output_path}")
            
    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python mirror_convert.py <image_name>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    mirror_image(image_path)
