import re
from typing import Dict, Any, List
from datetime import datetime
import json

GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")

def validate_dispatch_payload(payload: Dict[str, Any]) -> List[str]:
    errors = []
    
    if not payload or not isinstance(payload, dict):
        return errors

    for k, v in payload.items():
        # 1. GSTIN Validation
        if 'gstin' in k.lower() and isinstance(v, str) and v.strip():
            if not GSTIN_REGEX.match(v.strip().upper()):
                errors.append(f"Invalid GSTIN format for field '{k}': {v}")
                
        # 2. PAN Validation
        if 'pan' in k.lower() and isinstance(v, str) and v.strip():
            if not PAN_REGEX.match(v.strip().upper()):
                errors.append(f"Invalid PAN format for field '{k}': {v}")

        # 3. Date Sanity
        if 'date' in k.lower() and isinstance(v, str) and v.strip():
            if re.match(r"^\d{4}-\d{2}-\d{2}$", v.strip()):
                try:
                    dt = datetime.strptime(v.strip(), "%Y-%m-%d")
                    if dt.year < 2000 or dt.year > 2100:
                        errors.append(f"Date Sanity Error for field '{k}': {v} is outside valid bounds.")
                except ValueError:
                    pass

    # 4. Math Errors: Sum of line items <= total
    line_items_raw = payload.get('_line_items')
    if line_items_raw:
        try:
            if isinstance(line_items_raw, str):
                items = json.loads(line_items_raw)
            elif isinstance(line_items_raw, list):
                items = line_items_raw
            else:
                items = []

            calculated_sum = 0.0
            for item in items:
                if isinstance(item, dict):
                    total_amt = item.get('total_amount') or item.get('item_total')
                    if total_amt:
                        try:
                            calculated_sum += float(str(total_amt).replace(',', ''))
                        except ValueError:
                            pass
            
            reported_total = None
            for k, v in payload.items():
                if 'total' in k.lower() and 'item' not in k.lower() and v is not None:
                    try:
                        reported_total = float(str(v).replace(',', ''))
                        break
                    except ValueError:
                        pass
            
            if reported_total is not None and calculated_sum > 0:
                if calculated_sum > reported_total:
                     errors.append(f"Math Error: Sum of line items ({calculated_sum}) exceeds reported total ({reported_total}).")

        except (json.JSONDecodeError, TypeError):
            pass

    return errors
