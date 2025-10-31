import pandas as pd

INPUT_FILE = "dictionary.csv"
OUTPUT_FILE = "dictionary2.csv"

def filter_definitions():
    # Read CSV
    df = pd.read_csv(INPUT_FILE)

    # Column name for the definition field
    # Assuming it is 'definition' (based on your earlier script)
    if 'definition' not in df.columns:
        print("❌ Error: 'definition' column not found in the CSV.")
        print(f"Available columns: {list(df.columns)}")
        return

    # Filter out rows where definition matches the unwanted text
    unwanted = {"No definition found", "No English definition found", "No valid English definition (non-alphabetic)"}
    filtered_df = df[~df['definition'].isin(unwanted)]
    filtered_df = filtered_df[~filtered_df['definition'].str.contains(r"\(ethnic slur\)", case=False, na=False)]
    filtered_df = filtered_df[~filtered_df['definition'].str.contains(r"\(born in", case=False, na=False)]

    # Write filtered data to new CSV
    filtered_df.to_csv(OUTPUT_FILE, index=False, quoting=1)  # quoting=1 → csv.QUOTE_ALL

    print(f"✅ Done! Filtered file saved as: {OUTPUT_FILE}")
    print(f"Removed {len(df) - len(filtered_df)} rows without definitions.")

if __name__ == "__main__":
    filter_definitions()
