import os

def concatenate_md_files(src_dir, dst_file):
    with open(dst_file, 'w', encoding='utf-8') as outfile:
        for root, _, files in os.walk(src_dir):
            for file in files:
                if file.endswith('.md') or file.endswith('.txt'):
                    src_file = os.path.join(root, file)
                    with open(src_file, 'r', encoding='utf-8') as infile:
                        outfile.write(infile.read())
                        outfile.write("\n\n")  # Add a newline for separation between files
                    print(f"Copied content from {src_file}")

if __name__ == "__main__":
    source_directory = input("Enter the source directory path: ")
    destination_file = input("Enter the destination file path (including file name): ")

    concatenate_md_files(source_directory, destination_file)
    print(f"All .md files have been concatenated into {destination_file}.")
    