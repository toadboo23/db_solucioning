#!/usr/bin/env python3
"""
Script para actualizar el CSV con los nuevos campos glovo y uber_eats
"""

import pandas as pd
import sys
import os

def actualizar_csv_plataformas():
    # Archivo de entrada
    csv_file = "plantilla_empleados_93.csv"
    csv_updated = "plantilla_empleados_actualizada.csv"
    
    try:
        # Verificar que el archivo existe
        if not os.path.exists(csv_file):
            print(f"❌ Error: No se encontró el archivo '{csv_file}'")
            return False
        
        print(f"📖 Leyendo archivo CSV: {csv_file}")
        
        # Leer el archivo CSV
        df = pd.read_csv(csv_file)
        
        print(f"✅ Archivo leído exitosamente")
        print(f"📊 Dimensiones: {df.shape[0]} filas x {df.shape[1]} columnas")
        
        # Agregar los nuevos campos
        print(f"🔧 Agregando campos 'glovo' y 'uber_eats'...")
        
        # Agregar columna glovo después de flota
        if 'glovo' not in df.columns:
            df.insert(df.columns.get_loc('flota') + 1, 'glovo', '')
            print(f"✅ Campo 'glovo' agregado")
        else:
            print(f"⚠️ Campo 'glovo' ya existe")
        
        # Agregar columna uber_eats después de glovo
        if 'uber_eats' not in df.columns:
            df.insert(df.columns.get_loc('glovo') + 1, 'uber_eats', '')
            print(f"✅ Campo 'uber_eats' agregado")
        else:
            print(f"⚠️ Campo 'uber_eats' ya existe")
        
        # Mostrar las nuevas columnas
        print(f"\n📋 Columnas actualizadas:")
        for i, col in enumerate(df.columns, 1):
            if col in ['glovo', 'uber_eats']:
                print(f"   {i}. {col} ⭐ NUEVO")
            else:
                print(f"   {i}. {col}")
        
        # Guardar como CSV actualizado
        print(f"\n💾 Guardando como CSV actualizado: {csv_updated}")
        df.to_csv(csv_updated, index=False, encoding='utf-8')
        
        print(f"✅ CSV actualizado creado exitosamente!")
        print(f"📁 Archivo: {csv_updated}")
        print(f"📊 Dimensiones finales: {df.shape[0]} filas x {df.shape[1]} columnas")
        
        return True
        
    except Exception as e:
        print(f"❌ Error durante la actualización: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔄 Iniciando actualización de CSV con campos de plataformas...")
    success = actualizar_csv_plataformas()
    
    if success:
        print("\n🎉 ¡CSV actualizado! Los nuevos campos 'glovo' y 'uber_eats' están listos para usar.")
    else:
        print("\n💥 La actualización falló. Revisa el error anterior.")
        sys.exit(1)
