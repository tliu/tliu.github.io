import os

w = open("framedata.js", "w")
w.write("const all_moves = {")
for file in os.listdir("."):
    if "json" in file:
        f = open(f'./{file}')
        name = file.split(".")[0]
        w.write(f'"{name}" : ')
        #w.write(file.split("\.")[0])
        w.write(f.read())
        w.write(",")

w.write("}")
        
w.close()
        
