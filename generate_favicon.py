from PIL import Image, ImageDraw

# Create an image with transparent background
size = 256
img = Image.new('RGBA', (size, size), color=(0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Draw a background circle
d.ellipse([(16, 16), (size-16, size-16)], fill=(31, 41, 55, 255)) # #1f2937

# Draw a terminal prompt `>_`
# >
d.line([(64, 80), (120, 128), (64, 176)], fill=(96, 165, 250, 255), width=16, joint="curve") # #60a5fa
# _
d.line([(136, 176), (192, 176)], fill=(96, 165, 250, 255), width=16)

img.save('favicon.png')
img.save('favicon.ico', format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
