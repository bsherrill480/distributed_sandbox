import csv
import sqlite3

conn = sqlite3.connect('ski_read.db')

c = conn.cursor()

c.execute('DELETE FROM rides')

with open('BSDSAssignment2Day1.csv') as csvfile:
    reader = csv.DictReader(csvfile)
    # lines = list(reader)
    # print(lines[0])
    for row in reader:
        values = [row['ResortID'], row['Day'], row['SkierID'], row['LiftID'],  row['Time']]
        c.execute('INSERT INTO rides VALUES (?, ?, ?, ?, ?)', values)

conn.commit()
conn.close()
