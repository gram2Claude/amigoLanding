import os
from PIL import Image, ImageChops

def trim_white(im):
    # Convert to RGB to ignore alpha when calculating diff with white
    bg = Image.new("RGB", im.size, (255, 255, 255))
    if im.mode in ('RGBA', 'LA'):
        # composite on white bg first to avoid transparent parts being seen as black
        bg.paste(im, mask=im.split()[-1])
    else:
        bg.paste(im)
    
    # Calculate difference from pure white
    diff = ImageChops.difference(bg, Image.new("RGB", im.size, (255, 255, 255)))
    diff = ImageChops.add(diff, diff, 2.0, -100)
    
    bbox = diff.getbbox()
    if bbox:
        # Add a small 2px padding so it's not strictly tight
        w, h = im.size
        pad = 2
        bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(w, bbox[2] + pad),
            min(h, bbox[3] + pad)
        )
        return im.crop(bbox)
    return im

in_dir = "assets/images/logos_raw"
out_dir = "assets/images/logos"

os.makedirs(out_dir, exist_ok=True)

for filename in os.listdir(in_dir):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        try:
            im = Image.open(os.path.join(in_dir, filename))
            # Convert to RGBA so we can save as PNG safely
            im = im.convert("RGBA")
            im_trimmed = trim_white(im)
            
            # Keep the name simple, replace extension with .png
            base_name = os.path.splitext(filename)[0]
            out_path = os.path.join(out_dir, base_name + ".png")
            im_trimmed.save(out_path, "PNG")
            print(f"Processed: {filename} -> {base_name}.png")
        except Exception as e:
            print(f"Error processing {filename}: {e}")
