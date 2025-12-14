import os
import datetime

def file_reader(filename: str) -> None:
    """
    Function to read the data in .tsv format,
    
    Input:
        filename: str - Name of the file to read
        
    Output:
        None
    """
    
    delimiter = "\t"
    
    # Opens the file and extracts the header and data separately
    with open(filename, "r") as file:
        header = file.readline().strip().split(delimiter)
        data = []
        
        for line in file:
            line = line.strip()
            cols = line.split(delimiter)
            
            data.append(cols)
    
    return (header, data)

def crunch_dislikes(data):
    """
    Parse the 'Do you dislike anything...' column from survey data.

    Input:
        data: list of rows (each row is a list of column strings)

    Output:
        list where the first element is the header (known dislike categories + 'Other'),
        and each subsequent element is a list of 'TRUE'/'FALSE' for each category
        followed by any leftover text (or 'N/A').
    """

    # Known dislike categories (order preserved for output)
    categories = [
        "Scalpers and resellers",
        "Long queues",
        "Can't get item you want",
        "Desired item out of stock",
        "I actually enjoy the whole process!",
    ]

    header = categories + ["Other"]
    ret = [header]

    for row in data:
        # each row is a list of columns; column index 5 is the dislikes column
        try:
            raw = row[5].strip()
        except Exception:
            raw = ""

        if not raw or raw in ("-", "."):
            # no response
            flags = ["FALSE"] * len(categories)
            other = "N/A"
        else:
            parts = [p.strip() for p in raw.split(',') if p.strip()]
            flags = ["TRUE" if c in parts else "FALSE" for c in categories]
            # anything not matching known categories is treated as 'Other'
            other_parts = [p for p in parts if p not in categories]
            other = ", ".join(other_parts) if other_parts else "N/A"

        ret.append(flags + [other])

    return ret

def csv_writer(data: list, name: str) -> str:
    """
    Writes a .csv file to export with the sizes and quantities of a certain merch item.
    
    Input:
        merch: dict - Updated merch data to export to .csv
        filename: str - Name of the file to be written
        
    Output:
        return_message: str - Success message of writing the .csv file
    """
    timestamp = datetime.datetime.now().strftime("%d-%m-%Y %H%M%S")
    filename = f"{name} - {timestamp}.csv"
    
    return_message = f"Sucessfully written {filename}."
        
    # Create a file to write to...
    with open(filename, "w") as file:
        for rows in data:
            rows: list
            for cols in rows:
                if rows.index(cols) != (len(rows) - 1):
                    file.write(f"{cols},")
                else:
                    file.write(f"{cols}\n")
    
    print(return_message)
    
        
def main():
    original_directory = os.getcwd()
    os.chdir(f"{original_directory}/data")
    raw_data = os.listdir()
    indexed_data = {}
    
    for idx, raw_data in enumerate(raw_data):
         indexed_data[idx + 1] = raw_data
         print(f"{idx + 1}. {raw_data}")
    
    print("0. Exit")

    while True:
        data_to_crunch = input(f"Please enter the number of the data you would like to crunch: ")
        
        if data_to_crunch != "0": 
            try:
                selected_data = indexed_data[int(data_to_crunch)]
                break
            except:
                raise ValueError("Please select a valid number.")
        else:
            exit()
    
    header, data = file_reader(selected_data)
    dislikes_data = crunch_dislikes(data)
    
    os.chdir(f"{original_directory}/output")
    csv_writer(dislikes_data, "dislikes_data")
    
if __name__ == "__main__":
    main()
