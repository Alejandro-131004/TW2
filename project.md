**Segunda entrega:**
- O objetivo da segunda entrega é tornar o jogo distribuído, permitindo a participação de jogadores em diferentes computadores. Para isso será usado um servidor que fornecerá um serviço web em:
    - http://twserver.alunos.dcc.fc.up.pt:8008/

**Objetivos:**
- **Pedidos** a realizar ao servidor
- **Respostas** respostas dadas pelo servidor
- **Exemplos** de sequências de pedidos/ respostas
- **Valorizações** ao trabalho


| Função    | Argumentos          | Descrição                                |
|-----------|---------------------|------------------------------------------|
| group     | nick, password, size, game, cell | Regista utilizador associado a senha       |
| register  | nick, password      | Regista utilizador associado a senha     |
| join      | nick, password, size, game       | Junta jogadores para iniciar jogo         |
| leave     | nick, password, game            | Desistir de jogo não terminado            |
| notify    | nick, password, game, cell      | Notifica servidor de uma jogada           |
| update †  | nick, cell          | Atualiza a situação do jogo              |
| ranking   | nick, game          | Retorna tabela classificativa            |

† Server-Sent Events com GET e dados urlencoded

Restantes são fetch (ou XMLHttpRequest) com POST e dados em JSON