"""
Script para baixar áudio do YouTube para o Pagode Hero usando yt-dlp.
Uso:
    python scripts/baixar_youtube.py "URL_DO_YOUTUBE" [nome_da_faixa]

Exemplo:
    python scripts/baixar_youtube.py "https://www.youtube.com/watch?v=..." melhor-eu-ir
"""

import sys
import os
import subprocess

def main():
    if len(sys.argv) < 2:
        print("Uso: python scripts/baixar_youtube.py <URL_DO_YOUTUBE> [nome_arquivo]")
        print("Exemplo: python scripts/baixar_youtube.py \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\" menos-e-mais")
        sys.exit(1)

    url = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "musica_youtube"

    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{name}.%(ext)s")

    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        "-x",
        "--audio-format", "m4a",
        "-o", output_path,
        url
    ]

    print(f"Baixando áudio de {url} para {output_dir}...")
    try:
        subprocess.run(cmd, check=True)
        print("\n✅ Áudio baixado com sucesso!")
        print(f"O arquivo está disponível na pasta public/audio/ para o Pagode Hero!")
    except Exception as e:
        print(f"\n❌ Erro ao baixar com yt-dlp: {e}")
        # Tenta sem converter o formato caso falte encoder
        cmd_raw = [
            sys.executable,
            "-m",
            "yt_dlp",
            "-f", "ba/b",
            "-o", output_path,
            url
        ]
        try:
            subprocess.run(cmd_raw, check=True)
            print("\n✅ Áudio baixado no formato nativo com sucesso!")
        except Exception as e2:
            print(f"Falha: {e2}")

if __name__ == "__main__":
    main()
