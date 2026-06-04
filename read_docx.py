import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path):
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            for p in tree.findall('.//w:p', namespaces):
                texts = []
                for node in p.findall('.//w:t', namespaces):
                    if node.text:
                        texts.append(node.text)
                if texts:
                    paragraphs.append(''.join(texts))
                else:
                    paragraphs.append('') # Empty line for empty paragraphs
            
            print('\n'.join(paragraphs))
    except Exception as e:
        print(f"Error reading docx: {e}")

if __name__ == '__main__':
    read_docx(sys.argv[1])
