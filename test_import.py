#!/usr/bin/env python3
"""
Script de prueba para verificar la funcionalidad de importación de empleados
"""

import csv
import json
from pathlib import Path

def test_csv_parsing():
    """Prueba el parsing del CSV de ejemplo"""
    csv_file = "plantilla_importacion_empleados.csv"
    
    if not Path(csv_file).exists():
        print(f"❌ Archivo {csv_file} no encontrado")
        return False
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            # Leer CSV con delimitador semicolon
            reader = csv.DictReader(file, delimiter=';')
            rows = list(reader)
            
            print(f"✅ CSV parseado correctamente. {len(rows)} filas encontradas")
            
            # Verificar estructura
            if rows:
                headers = list(rows[0].keys())
                print(f"📋 Headers encontrados: {len(headers)}")
                print(f"   {', '.join(headers[:5])}...")
                
                # Verificar campos críticos
                required_fields = ['id_glovo', 'email_glovo', 'nombre', 'apellido', 'horas']
                missing_fields = [field for field in required_fields if field not in headers]
                
                if missing_fields:
                    print(f"❌ Campos faltantes: {missing_fields}")
                    return False
                else:
                    print("✅ Todos los campos requeridos están presentes")
                
                # Mostrar primera fila como ejemplo
                print(f"\n📝 Primera fila de ejemplo:")
                for key, value in rows[0].items():
                    print(f"   {key}: {value}")
                
                return True
            else:
                print("❌ No se encontraron filas en el CSV")
                return False
                
    except Exception as e:
        print(f"❌ Error al parsear CSV: {e}")
        return False

def test_data_validation():
    """Prueba la validación de datos"""
    csv_file = "plantilla_importacion_empleados.csv"
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file, delimiter=';')
            rows = list(reader)
            
            print(f"\n🔍 Validando datos...")
            
            for i, row in enumerate(rows, 1):
                # Validar id_glovo
                if not row.get('id_glovo'):
                    print(f"❌ Fila {i}: id_glovo vacío")
                    return False
                
                # Validar email_glovo
                if not row.get('email_glovo') or '@' not in row['email_glovo']:
                    print(f"❌ Fila {i}: email_glovo inválido")
                    return False
                
                # Validar horas (debe ser número)
                try:
                    horas = int(row.get('horas', 0))
                    if horas <= 0:
                        print(f"❌ Fila {i}: horas debe ser mayor a 0")
                        return False
                except ValueError:
                    print(f"❌ Fila {i}: horas debe ser un número")
                    return False
                
                # Validar ciudad
                if not row.get('ciudad'):
                    print(f"❌ Fila {i}: ciudad vacía")
                    return False
            
            print("✅ Todos los datos son válidos")
            return True
            
    except Exception as e:
        print(f"❌ Error en validación: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 Iniciando pruebas de importación...\n")
    
    # Prueba 1: Parsing del CSV
    if not test_csv_parsing():
        print("\n❌ Falló la prueba de parsing")
        return
    
    # Prueba 2: Validación de datos
    if not test_data_validation():
        print("\n❌ Falló la validación de datos")
        return
    
    print("\n🎉 Todas las pruebas pasaron exitosamente!")
    print("\n📋 Resumen:")
    print("   ✅ CSV parseado correctamente")
    print("   ✅ Estructura de datos válida")
    print("   ✅ Campos requeridos presentes")
    print("   ✅ Datos validados correctamente")
    print("\n💡 La plantilla está lista para usar en el sistema")

if __name__ == "__main__":
    main()
