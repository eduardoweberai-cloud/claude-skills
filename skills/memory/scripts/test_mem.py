"""Testes do mem.py. Rodar: python -X utf8 -m unittest discover -s scripts"""
import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import mem  # noqa: E402


class MemTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["AGENT_MEMORY_DIR"] = self.tmp.name
        self.body = Path(self.tmp.name) / "body.md"
        self.body.write_text("## Feito\n- Landing page publicada\n## Próximo passo\nMedir conversão.", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def run_cli(self, *args):
        out = io.StringIO()
        with redirect_stdout(out):
            mem.main(list(args))
        return out.getvalue()

    def test_save_cria_sessao_e_indexa(self):
        out = self.run_cli("save", "--project", "site", "--title", "Landing página do cliente", "--body-file", str(self.body))
        self.assertIn("Sessão salva", out)
        files = list((Path(self.tmp.name) / "sessions").glob("*.md"))
        self.assertEqual(len(files), 1)
        self.assertIn("landing-pagina-do-cliente", files[0].name)
        self.assertIn("Medir conversão", files[0].read_text(encoding="utf-8"))
        self.assertIn("| session | site |", (Path(self.tmp.name) / "index.md").read_text(encoding="utf-8"))

    def test_learn_atualiza_fato_sem_duplicar(self):
        for _ in range(2):
            self.run_cli("learn", "--project", "site", "--title", "Cliente aprova por e-mail", "--body-file", str(self.body))
        idx = (Path(self.tmp.name) / "index.md").read_text(encoding="utf-8")
        self.assertEqual(idx.count("Cliente aprova por e-mail"), 1)
        self.assertEqual(len(list((Path(self.tmp.name) / "facts").glob("*.md"))), 1)

    def test_save_mesmo_titulo_nao_sobrescreve(self):
        for _ in range(2):
            self.run_cli("save", "--project", "site", "--title", "Mesma", "--body-file", str(self.body))
        self.assertEqual(len(list((Path(self.tmp.name) / "sessions").glob("*.md"))), 2)

    def test_recent_filtra_por_projeto(self):
        self.run_cli("save", "--project", "site", "--title", "Sessão A", "--body-file", str(self.body))
        self.run_cli("save", "--project", "outro", "--title", "Sessão B", "--body-file", str(self.body))
        out = self.run_cli("recent", "--project", "site")
        self.assertIn("Sessão A", out)
        self.assertNotIn("Sessão B", out)

    def test_search_acha_termo_com_acento(self):
        self.run_cli("save", "--project", "site", "--title", "Sessão C", "--body-file", str(self.body))
        self.assertIn("conversão", self.run_cli("search", "CONVERSÃO"))
        self.assertIn("Nada encontrado", self.run_cli("search", "inexistente"))


if __name__ == "__main__":
    unittest.main()
