import json
import re
import pandas as pd


def sanitize_filename(text):
    """Sana o texto para ser usado com segurança em caminhos de imagem (URLs/arquivos)."""
    text = text.lower()
    # Substitui caracteres acentuados comuns
    replacements = {
        "á": "a",
        "à": "a",
        "ã": "a",
        "â": "a",
        "é": "e",
        "ê": "e",
        "í": "i",
        "ó": "o",
        "ô": "o",
        "õ": "o",
        "ú": "u",
        "ç": "c",
    }
    for char, repl in replacements.items():
        text = text.replace(char, repl)

    # Remove qualquer caractere que não seja alfanumérico, espaço ou hífen
    text = re.sub(r"[^\w\s-]", "", text)
    # Substitui espaços por hífen
    text = re.sub(r"\s+", "-", text)
    return text.strip("-")


def parse_pneu_description(desc):
    """Extrai marca, medida, largura, perfil, aro e modelo a partir da descrição."""
    if not isinstance(desc, str):
        return None

    # Extrai a marca se estiver no formato "NOME DO PNEU - MARCA"
    brand = "Outras"
    desc_main = desc
    if " - " in desc:
        parts = desc.rsplit(" - ", 1)
        desc_main = parts[0]
        brand = parts[1].strip()

    # Remove prefixos comuns
    desc_clean = re.sub(
        r"^(KIT\s+PNEU|PNEU)\s+", "", desc_main, flags=re.IGNORECASE
    ).strip()

    # Padrão métrico: ex: 205/55R16, 195/65 R15, 225/45ZR18
    match = re.search(
        r"(\d{3})/(\d{2})\s*[Zz]?[Rr]\s*(\d{2}(?:\.\d)?)", desc_clean
    )
    largura, perfil, aro = None, None, None

    if match:
        largura = int(match.group(1))
        perfil = match.group(2)
        aro = match.group(3)
    else:
        # Padrão comercial/van: ex: 195R14C, 185R14
        match_comm = re.search(r"(\d{3})\s*[Zz]?[Rr]\s*(\d{2})[Cc]?", desc_clean)
        if match_comm:
            largura = int(match_comm.group(1))
            perfil = "80"
            aro = match_comm.group(2)

    if largura:
        # Tenta capturar o modelo removendo as medidas e índices
        modelo = desc_clean
        if match:
            modelo = desc_clean[match.end() :].strip()
        elif match_comm:
            modelo = desc_clean[match_comm.end() :].strip()

        modelo = re.sub(r"\b\d{2,3}(/\d{2,3})?[A-Z]\b", "", modelo)
        modelo = re.sub(r"\b\d+PR\b", "", modelo, flags=re.IGNORECASE)
        modelo = re.sub(
            r"\b(XL|LT|TL|EXTRA LOAD|BW|OWL|BSW)\b", "", modelo, flags=re.IGNORECASE
        )
        modelo = re.sub(r"\s+", " ", modelo).strip()

        return {
            "largura": largura,
            "perfil": perfil,
            "aro": aro,
            "medida": f"{largura}/{perfil} R{aro}",
            "marca": brand,
            "modelo": modelo if modelo else "Pneu Passeio / Utilitário",
        }

    return None


def converter_excel_para_json(caminho_excel, caminho_saida_json):
    # Lê a planilha
    df = pd.read_excel(caminho_excel, sheet_name=0)

    # Limpa nomes das colunas
    df.columns = [c.strip() for c in df.columns]

    # A coluna H é o índice 7 (0-indexed: A=0, B=1, ..., H=7) -> 'Preço à vista'
    coluna_preco_h = df.columns[7]

    lista_pneus = []
    pneu_id = 1

    for _, row in df.iterrows():
        estoque = row.get("Disponivel", 0)
        preco_bruto = row[coluna_preco_h]

        # Filtro 1: Estoque > 15 e Preço > 0
        if (
            pd.isna(estoque)
            or estoque <= 14
            or pd.isna(preco_bruto)
            or preco_bruto <= 0
        ):
            continue

        desc = row.get("Descricao", "")
        parsed = parse_pneu_description(desc)

        # Filtro 2: Largura superior a 155mm
        if parsed and parsed["largura"] > 155:
            preco = float(preco_bruto) * 1.04 / 0.8

            # Extrai índice de carga/velocidade se disponível (ex: 91V, 95H)
            indice_match = re.search(r"\b(\d{2,3}(/\d{2,3})?[A-Z])\b", desc)
            indice = indice_match.group(1) if indice_match else ""

            # Sanitiza a marca e o modelo para compor o nome do arquivo da imagem
            marca_slug = sanitize_filename(parsed["marca"])
            modelo_slug = sanitize_filename(parsed["modelo"])

            # Formata o caminho da imagem: imagens/marca/modelo.jpg
            imagem_path = f"imagens/{marca_slug}/{modelo_slug}.jpg"

            item = {
                "id": pneu_id,
                "marca": parsed["marca"],
                "modelo": parsed["modelo"],
                "medida": parsed["medida"],
                "indice": indice,
                "preco": round(preco, 2),
                "estoque": int(estoque),
                "imagem": imagem_path,
            }

            lista_pneus.append(item)
            pneu_id += 1

    # Salva em dados.json
    with open(caminho_saida_json, "w", encoding="utf-8") as f:
        json.dump(lista_pneus, f, indent=2, ensure_ascii=False)

    print(
        f"Sucesso! {len(lista_pneus)} pneus processados e salvos em '{caminho_saida_json}'."
    )


if __name__ == "__main__":
    converter_excel_para_json(
        caminho_excel="Tabela 9.xls",
        caminho_saida_json="dados.json",
    )