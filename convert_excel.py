import pandas as pd
import json

# Read the Excel file
df = pd.read_excel('Master_Data_Professional Health Mapping 4 as of 9 August 2024.xlsx', sheet_name='Master Data')

# Filter relevant columns and remove rows without coordinates
df_filtered = df[['Facility name', 'Latitude', 'Longitude', 'Health facility type', 'Country', 'Icons']].dropna(subset=['Latitude', 'Longitude'])

# Convert to list of dictionaries
result = df_filtered.to_dict('records')

# Save to JSON file
output = {
    'success': True,
    'timestamp': '2025-09-30T00:00:00.000Z',
    'data': result
}

with open('health_facilities.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f'Converted {len(result)} health facilities')
print(f'Facility types: {df_filtered["Health facility type"].unique()}')