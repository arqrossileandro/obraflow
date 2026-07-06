#!/usr/bin/env python3
"""
Inserta la obra Serena Folk con todos sus datos en Supabase.
Necesita un JWT de usuario autenticado para que RLS permita los inserts.

Uso:
  python3 insert_serena_folk.py <USER_JWT>

El JWT se obtiene haciendo login desde la app y copiándolo del localStorage
(key: sb-...-auth-token) o desde DevTools → Application → LocalStorage.
"""
import json
import sys
import os
import urllib.request
import urllib.error
from datetime import datetime, timedelta

SUPABASE_URL = "https://dfstasoowrezcmouwqip.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmc3Rhc29vd3JlemNtb3V3cWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTUyNjcsImV4cCI6MjA5ODg3MTI2N30.NGR9-0nRh9Ir6i42z9F0op3Y_9QIx5T1wyT45Fgq5V8"

def api(method, path, body=None, jwt=None):
    """Llama a la API REST de Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {jwt if jwt else SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        print(f"  ERROR {e.code} en {method} {path}: {body_text[:500]}")
        return None
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def months_to_date(month_name, year=2026):
    """Convierte 'MAYO' a '2026-05-01'."""
    months = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
        'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
    }
    m = months.get(month_name.upper()) if month_name else 5
    return f"{year:04d}-{m:02d}-01" if m else "2026-05-01"

def add_days(iso_date, days):
    d = datetime.strptime(iso_date, '%Y-%m-%d')
    return (d + timedelta(days=days)).strftime('%Y-%m-%d')

# ============================================================================
# Colores por gremio
# ============================================================================
COLOR_PLOMERIA = '#0ea5e9'      # sky
COLOR_ALBANILERIA = '#f97316'   # orange
COLOR_HORMIGON = '#64748b'      # slate
COLOR_MODULO_BASE = '#22c55e'   # green

# Colores por módulo (gradiente verde→azul→violeta)
MODULO_COLORS = [
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308',
]

# ============================================================================
# Main
# ============================================================================
def main():
    if len(sys.argv) < 2:
        print("Uso: python3 insert_serena_folk.py <USER_JWT>")
        print("Obtené tu JWT haciendo login en la app y luego en DevTools → Application → LocalStorage → copiar el valor de 'sb-dfstasoowrezcmouwqip-auth-token'")
        sys.exit(1)

    jwt = sys.argv[1].strip()
    print("Cargando datos extraídos...")
    with open('/home/z/my-project/download/serena-folk-data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Crear la obra
    print("\n=== Creando obra Serena Folk ===")
    obra_id = str(__import__('uuid').uuid4())
    obra = {
        'id': obra_id,
        'name': 'Serena Folk',
        'client': 'Serena Folk',
        'address': 'Serena Folk — Complejo de 13 módulos',
        'start_date': '2026-04-01',
        'end_date': '2027-03-31',
        'budget': 250000000,  # 250M total aproximado
        'color': '#22c55e',
        'status': 'en_curso',
        'progress': 0,
    }
    result = api('POST', 'obras', obra, jwt)
    if not result:
        print("ERROR: No se pudo crear la obra")
        sys.exit(1)
    print(f"  Obra creada: {result[0]['name']} (id: {obra_id})")

    # 2. Crear 13 módulos como tareas raíz (M01 a M13)
    print("\n=== Creando 13 módulos ===")
    modulo_ids = {}
    for i in range(1, 14):
        m_key = f"M{i:02d}"
        m_id = str(__import__('uuid').uuid4())
        modulo_ids[m_key] = m_id

        # Módulos 8-13 ya empezaron (mayo/junio), módulos 1-7 pendientes
        if i >= 8:
            start = '2026-05-01'
            status = 'en_curso'
        elif i >= 4:
            start = '2026-06-01'
            status = 'en_curso'
        elif i == 3:
            start = '2026-07-01'
            status = 'en_curso'
        else:  # 1, 2
            start = '2026-08-01'
            status = 'no_iniciada'

        end = add_days(start, 180)  # 6 meses por módulo
        task = {
            'id': m_id,
            'obra_id': obra_id,
            'parent_id': None,
            'name': f'Módulo {i:02d}',
            'description': f'Módulo {i:02d} del complejo Serena Folk',
            'start_date': start,
            'end_date': end,
            'progress': 30 if i >= 8 else (10 if i >= 4 else 0),
            'progress_mode': 'manual',
            'manual_progress': 30 if i >= 8 else (10 if i >= 4 else 0),
            'guild': 'Estructura',
            'color': MODULO_COLORS[i-1],
            'priority': 'alta',
            'status': status,
        }
        result = api('POST', 'tasks', task, jwt)
        if result:
            print(f"  {m_key} creado")
        else:
            print(f"  ERROR creando {m_key}")

    # 3. Crear tareas de Plomería Rodrigo por módulo
    print("\n=== Creando tareas de Plomería Rodrigo ===")
    plomeria = data['plomeria']
    plomeria_root_id = str(__import__('uuid').uuid4())
    # Tarea raíz "Plomería Rodrigo"
    root = {
        'id': plomeria_root_id,
        'obra_id': obra_id,
        'parent_id': None,
        'name': 'Plomería Rodrigo (Total)',
        'description': f'Plomería completa del complejo — Total: ${plomeria["monto_total"]:,.0f}',
        'start_date': '2026-05-01',
        'end_date': '2027-03-31',
        'progress': 5,
        'progress_mode': 'manual',
        'manual_progress': 5,
        'guild': 'Plomería',
        'color': COLOR_PLOMERIA,
        'priority': 'alta',
        'status': 'en_curso',
        'labor_cost': plomeria['monto_total'],
        'materials_cost': 0,
    }
    api('POST', 'tasks', root, jwt)
    print(f"  Plomería Rodrigo (Total) creada")

    # Subtareas por módulo
    for m_key, mod_data in plomeria['modules'].items():
        m_id = modulo_ids.get(m_key)
        if not m_id:
            continue

        # Tarea "Plomería Módulo XX"
        sub_id = str(__import__('uuid').uuid4())
        start = months_to_date(mod_data.get('start_month'), 2026)
        sub_task = {
            'id': sub_id,
            'obra_id': obra_id,
            'parent_id': plomeria_root_id,
            'name': f'Plomería {m_key}',
            'description': f'Plomería del {m_key} — monto módulo: ${mod_data["monto_total"]:,.0f}',
            'start_date': start,
            'end_date': add_days(start, 90),
            'progress': 0,
            'progress_mode': 'manual',
            'manual_progress': 0,
            'guild': 'Plomería',
            'color': COLOR_PLOMERIA,
            'priority': 'media',
            'status': 'no_iniciada',
            'labor_cost': mod_data['monto_total'],
        }
        api('POST', 'tasks', sub_task, jwt)

        # Subtareas de cada item (AGUA, CLOACALES, etc.)
        for item in mod_data['items']:
            if not item.get('is_section_header'):
                continue
            if item.get('amount', 0) == 0:
                continue
            item_id = str(__import__('uuid').uuid4())
            item_task = {
                'id': item_id,
                'obra_id': obra_id,
                'parent_id': sub_id,
                'name': f'{m_key} — {item["name"]}',
                'description': f'{item["name"]} — {item["pct"]*100:.1f}% del módulo',
                'start_date': start,
                'end_date': add_days(start, 30),
                'progress': int(item.get('finalizado', 0) * 100),
                'progress_mode': 'manual',
                'manual_progress': int(item.get('finalizado', 0) * 100),
                'guild': 'Plomería',
                'color': COLOR_PLOMERIA,
                'priority': 'baja',
                'status': 'finalizada' if item.get('finalizado', 0) >= 1 else 'no_iniciada',
                'labor_cost': item['amount'],
                'repercussion_percent': item['pct'] * 100,
            }
            api('POST', 'tasks', item_task, jwt)
        print(f"  Plomería {m_key} creada con sus items")

    # 4. Crear tareas de Albañilería Beltrán
    print("\n=== Creando tareas de Albañilería Beltrán ===")
    albanileria = data['albanileria']
    alb_root_id = str(__import__('uuid').uuid4())
    root = {
        'id': alb_root_id,
        'obra_id': obra_id,
        'parent_id': None,
        'name': 'Albañilería Beltrán (Total)',
        'description': f'Albañilería completa del complejo — Monto por módulo: ${albanileria["monto_total"]:,.0f}',
        'start_date': '2026-05-01',
        'end_date': '2027-03-31',
        'progress': 15,
        'progress_mode': 'manual',
        'manual_progress': 15,
        'guild': 'Albañilería',
        'color': COLOR_ALBANILERIA,
        'priority': 'critica',
        'status': 'en_curso',
        'labor_cost': albanileria['monto_total'] * 13,  # 13 módulos × monto por módulo
    }
    api('POST', 'tasks', root, jwt)
    print(f"  Albañilería Beltrán (Total) creada")

    for m_key, mod_data in albanileria['modules'].items():
        m_id = modulo_ids.get(m_key)
        if not m_id:
            continue

        sub_id = str(__import__('uuid').uuid4())
        start = months_to_date(mod_data.get('start_month'), 2026)
        sub_task = {
            'id': sub_id,
            'obra_id': obra_id,
            'parent_id': alb_root_id,
            'name': f'Albañilería {m_key}',
            'description': f'Albañilería del {m_key} — monto: ${mod_data["monto_total"]:,.0f}',
            'start_date': start,
            'end_date': add_days(start, 180),
            'progress': 0,
            'progress_mode': 'manual',
            'manual_progress': 0,
            'guild': 'Albañilería',
            'color': COLOR_ALBANILERIA,
            'priority': 'alta',
            'status': 'no_iniciada',
            'labor_cost': mod_data['monto_total'],
        }
        api('POST', 'tasks', sub_task, jwt)

        for item in mod_data['items']:
            if not item.get('is_section_header'):
                continue
            if item.get('amount', 0) == 0:
                continue
            item_id = str(__import__('uuid').uuid4())
            item_task = {
                'id': item_id,
                'obra_id': obra_id,
                'parent_id': sub_id,
                'name': f'{m_key} — {item["name"]}',
                'description': f'{item["name"]} — {item["pct"]*100:.1f}%',
                'start_date': start,
                'end_date': add_days(start, 60),
                'progress': int(item.get('finalizado', 0) * 100),
                'progress_mode': 'manual',
                'manual_progress': int(item.get('finalizado', 0) * 100),
                'guild': 'Albañilería',
                'color': COLOR_ALBANILERIA,
                'priority': 'media',
                'status': 'finalizada' if item.get('finalizado', 0) >= 1 else 'no_iniciada',
                'labor_cost': item['amount'],
                'repercussion_percent': item['pct'] * 100,
            }
            api('POST', 'tasks', item_task, jwt)
        print(f"  Albañilería {m_key} creada con sus items")

    # 5. Crear tareas de Llenadas de Hormigón
    print("\n=== Creando llenadas de hormigón ===")
    hormigon = data['hormigon']
    horm_root_id = str(__import__('uuid').uuid4())
    root = {
        'id': horm_root_id,
        'obra_id': obra_id,
        'parent_id': None,
        'name': 'Llenadas de Hormigón (Plan Integral)',
        'description': f'Plan integral de llenadas — {len(hormigon["llenadas"])} tiradas programadas',
        'start_date': '2026-04-07',
        'end_date': '2026-11-30',
        'progress': 30,
        'progress_mode': 'manual',
        'manual_progress': 30,
        'guild': 'Hormigón',
        'color': COLOR_HORMIGON,
        'priority': 'critica',
        'status': 'en_curso',
    }
    api('POST', 'tasks', root, jwt)
    print(f"  Llenadas de Hormigón (Plan Integral) creada")

    # Agrupar por módulo
    by_module = {}
    for l in hormigon['llenadas']:
        for m in l.get('modules', []):
            if m not in by_module:
                by_module[m] = []
            by_module[m].append(l)

    # Si no hay módulo asignado, agrupar por "general"
    for l in hormigon['llenadas']:
        if not l.get('modules'):
            if 'GENERAL' not in by_module:
                by_module['GENERAL'] = []
            by_module['GENERAL'].append(l)

    for m_key, llenadas in by_module.items():
        sub_id = str(__import__('uuid').uuid4())
        if llenadas:
            first_date = min(l['date'] for l in llenadas)
            last_date = max(l['date'] for l in llenadas)
        else:
            first_date = '2026-04-07'
            last_date = '2026-11-30'

        total_m3 = sum(l['m3'] for l in llenadas)
        sub_task = {
            'id': sub_id,
            'obra_id': obra_id,
            'parent_id': horm_root_id,
            'name': f'Hormigón {m_key}',
            'description': f'Llenadas de hormigón del {m_key} — {len(llenadas)} tiradas, total {total_m3:.1f} m³',
            'start_date': first_date,
            'end_date': last_date,
            'progress': 50 if m_key in ['M6', 'M7', 'M8', 'M9'] else (20 if m_key in ['M4', 'M5'] else 0),
            'progress_mode': 'manual',
            'manual_progress': 50 if m_key in ['M6', 'M7', 'M8', 'M9'] else (20 if m_key in ['M4', 'M5'] else 0),
            'guild': 'Hormigón',
            'color': COLOR_HORMIGON,
            'priority': 'alta',
            'status': 'en_curso' if m_key in ['M6', 'M7', 'M8', 'M9', 'M4', 'M5'] else 'no_iniciada',
            'materials_cost': int(total_m3 * 80000),  # estimo $80K por m³ de H25
        }
        api('POST', 'tasks', sub_task, jwt)

        # Subtareas por llenada
        for l in llenadas:
            l_id = str(__import__('uuid').uuid4())
            # Determinar estado según fecha
            today = datetime.now()
            l_date = datetime.strptime(l['date'], '%Y-%m-%d')
            if l_date < today:
                status = 'finalizada'
                progress = 100
            elif (l_date - today).days <= 30:
                status = 'en_curso'
                progress = 50
            else:
                status = 'no_iniciada'
                progress = 0

            item_task = {
                'id': l_id,
                'obra_id': obra_id,
                'parent_id': sub_id,
                'name': f'{m_key} — {l["description"]} ({l["m3"]:.1f} m³)',
                'description': f'{l["description"]} — {l["m3"]} m³ — fecha: {l["date"]}',
                'start_date': l['date'],
                'end_date': add_days(l['date'], 1),
                'progress': progress,
                'progress_mode': 'manual',
                'manual_progress': progress,
                'guild': 'Hormigón',
                'color': COLOR_HORMIGON,
                'priority': 'alta' if status == 'en_curso' else 'media',
                'status': status,
                'materials_cost': int(l['m3'] * 80000),
            }
            api('POST', 'tasks', item_task, jwt)
        print(f"  Hormigón {m_key}: {len(llenadas)} llenadas, {total_m3:.1f} m³")

    print("\n=== ¡LISTO! ===")
    print(f"Obra Serena Folk creada con:")
    print(f"  - 13 módulos (M01-M13)")
    print(f"  - Plomería Rodrigo con {len(plomeria['modules'])} módulos × items")
    print(f"  - Albañilería Beltrán con {len(albanileria['modules'])} módulos × items")
    print(f"  - {len(hormigon['llenadas'])} llenadas de hormigón")
    print(f"\nAbrí la app y seleccioná 'Serena Folk' para verla.")

if __name__ == '__main__':
    main()
