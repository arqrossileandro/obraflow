#!/usr/bin/env python3
"""
Recalcula las fechas de todas las tareas padre en Supabase
según el min/max de sus hijos.
Útil para arreglar datos cargados con fechas incorrectas.

Uso: python3 recalc_parent_dates.py <JWT>
"""
import json
import sys
import urllib.request
import urllib.error

SUPABASE_URL = "https://dfstasoowrezcmouwqip.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmc3Rhc29vd3JlemNtb3V3cWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTUyNjcsImV4cCI6MjA5ODg3MTI2N30.NGR9-0nRh9Ir6i42z9F0op3Y_9QIx5T1wyT45Fgq5V8"

def api(method, path, body=None, jwt=None):
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
        print(f"  ERROR {e.code}: {e.read().decode()[:300]}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Uso: python3 recalc_parent_dates.py <JWT>")
        sys.exit(1)
    jwt = sys.argv[1].strip()

    # 1. Traer todas las tareas
    print("Cargando tareas...")
    tasks = api('GET', 'tasks?select=id,parent_id,start_date,end_date,type,name&order=start_date.asc', jwt=jwt)
    if not tasks:
        print("No hay tareas")
        return

    print(f"  {len(tasks)} tareas cargadas")

    # 2. Construir mapa de hijos por padre
    children_map = {}
    for t in tasks:
        pid = t.get('parent_id')
        if pid:
            if pid not in children_map:
                children_map[pid] = []
            children_map[pid].append(t)

    # 3. Recalcular fechas de padres recursivamente (de abajo hacia arriba)
    # Iterar hasta que no haya cambios
    updated_count = 0
    iterations = 0
    while iterations < 10:
        iterations += 1
        changes_this_round = 0

        # Crear mapa de tareas por id para lookup rápido
        task_map = {t['id']: t for t in tasks}

        for t in tasks:
            # Los hitos no se recalculan
            if t.get('type') == 'hito':
                continue

            children = children_map.get(t['id'], [])
            if not children:
                continue

            min_start = min(c['start_date'] for c in children)
            max_end = max(c['end_date'] for c in children)

            if t['start_date'] != min_start or t['end_date'] != max_end:
                t['start_date'] = min_start
                t['end_date'] = max_end
                changes_this_round += 1
                updated_count += 1
                print(f"  {t['name']}: → {min_start} a {max_end}")

        if changes_this_round == 0:
            break

    print(f"\n{updated_count} tareas padre actualizadas en {iterations} iteraciones")

    # 4. Guardar cambios en la DB
    if updated_count == 0:
        print("No hay cambios que guardar")
        return

    print("\nGuardando cambios en Supabase...")
    saved = 0
    for t in tasks:
        children = children_map.get(t['id'], [])
        if not children:
            continue
        if t.get('type') == 'hito':
            continue
        # Update via API
        result = api('PATCH', f"tasks?id=eq.{t['id']}", {
            'start_date': t['start_date'],
            'end_date': t['end_date'],
        }, jwt=jwt)
        if result is not None:
            saved += 1

    print(f"  {saved} tareas actualizadas en la DB")
    print("\n¡Listo! Recargá la app para ver las barras correctas.")

if __name__ == '__main__':
    main()
