/**
 * Dados sintéticos — Preferencial - NCA-SEM
 * Gerado em 2026-06-21 01:10:44 por generate_synthetic_data_all_projects.py
 *
 * Execute populateSyntheticData() PELO EDITOR do Apps Script para popular
 * as abas de domínio com ~30 registros cada (valida os gráficos do notebook).
 * Idempotente: limpa as linhas de dados antes de reinserir.
 *
 * NÃO define onOpen() — para não colidir com o menu real do projeto.
 */

function populateSyntheticData() {
  try {
    try {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var results = [];

        // Alunos
        try {
          var sheet_ALUNOS = ss.getSheetByName('Alunos') || ss.insertSheet('Alunos');
          if (sheet_ALUNOS.getLastRow() > 1) {
            sheet_ALUNOS.deleteRows(2, sheet_ALUNOS.getLastRow() - 1);
          }
          var h_sheet_ALUNOS = ["ID", "Name", "Email", "Phone", "Class", "GuardianName", "GuardianPhone", "Status", "CreatedAt", "UpdatedAt"];
          sheet_ALUNOS.getRange(1, 1, 1, h_sheet_ALUNOS.length).setValues([h_sheet_ALUNOS]);
          var d_sheet_ALUNOS = [
            ["ALU-0001", "Henrique Alves", "usuario1@escola.edu.br", "(61) 95959-3826", "4A", "Bruno Santos", "(61) 98596-7260", "ativo", "2026-04-01 01:10:44", "2026-06-01 01:10:44"],
            ["ALU-0002", "Henrique Alves", "usuario2@escola.edu.br", "(61) 97018-1190", "1A", "Bruno Santos", "(61) 92353-2999", "inativo", "2026-03-30 01:10:44", "2026-05-31 01:10:44"],
            ["ALU-0003", "Diego Souza", "usuario3@escola.edu.br", "(61) 91377-8856", "3C", "Bruno Santos", "(61) 93967-7290", "inativo", "2026-03-30 01:10:44", "2026-05-30 01:10:44"],
            ["ALU-0004", "Gabriela Rocha", "usuario4@escola.edu.br", "(61) 95888-3051", "1A", "Felipe Costa", "(61) 92040-9806", "ativo", "2026-04-30 01:10:44", "2026-05-26 01:10:44"],
            ["ALU-0005", "Ana Silva", "usuario5@escola.edu.br", "(61) 97451-9788", "5B", "Henrique Alves", "(61) 92047-9501", "ativo", "2026-05-25 01:10:44", "2026-05-22 01:10:44"],
            ["ALU-0006", "Bruno Santos", "usuario6@escola.edu.br", "(61) 93960-3948", "1A", "Henrique Alves", "(61) 96149-3015", "ativo", "2026-06-04 01:10:44", "2026-06-03 01:10:44"],
            ["ALU-0007", "Diego Souza", "usuario7@escola.edu.br", "(61) 93641-2438", "5B", "Eduarda Lima", "(61) 91573-2386", "ativo", "2026-04-17 01:10:44", "2026-06-12 01:10:44"],
            ["ALU-0008", "Felipe Costa", "usuario8@escola.edu.br", "(61) 99919-3811", "4A", "Ana Silva", "(61) 95068-5925", "ativo", "2026-04-15 01:10:44", "2026-05-24 01:10:44"],
            ["ALU-0009", "Eduarda Lima", "usuario9@escola.edu.br", "(61) 99750-8289", "2B", "Henrique Alves", "(61) 96127-9563", "ativo", "2026-04-04 01:10:44", "2026-06-04 01:10:44"],
            ["ALU-0010", "Diego Souza", "usuario10@escola.edu.br", "(61) 92622-1732", "2B", "Ana Silva", "(61) 94081-3321", "ativo", "2026-05-24 01:10:44", "2026-05-22 01:10:44"],
            ["ALU-0011", "Carla Oliveira", "usuario11@escola.edu.br", "(61) 94539-6882", "3C", "Carla Oliveira", "(61) 97914-2218", "ativo", "2026-05-18 01:10:44", "2026-06-09 01:10:44"],
            ["ALU-0012", "Carla Oliveira", "usuario12@escola.edu.br", "(61) 97554-8472", "1A", "Eduarda Lima", "(61) 97968-3346", "ativo", "2026-06-11 01:10:44", "2026-06-01 01:10:44"],
            ["ALU-0013", "Eduarda Lima", "usuario13@escola.edu.br", "(61) 94156-7097", "5B", "Carla Oliveira", "(61) 97876-3514", "ativo", "2026-04-26 01:10:44", "2026-06-09 01:10:44"],
            ["ALU-0014", "Ana Silva", "usuario14@escola.edu.br", "(61) 95055-2270", "3C", "Bruno Santos", "(61) 99707-2802", "inativo", "2026-06-12 01:10:44", "2026-06-11 01:10:44"],
            ["ALU-0015", "Bruno Santos", "usuario15@escola.edu.br", "(61) 96944-6464", "3C", "Carla Oliveira", "(61) 94698-5483", "ativo", "2026-06-08 01:10:44", "2026-06-09 01:10:44"],
            ["ALU-0016", "Diego Souza", "usuario16@escola.edu.br", "(61) 97203-2720", "1A", "Carla Oliveira", "(61) 99625-6022", "inativo", "2026-06-08 01:10:44", "2026-06-05 01:10:44"],
            ["ALU-0017", "Felipe Costa", "usuario17@escola.edu.br", "(61) 95620-5440", "5B", "Bruno Santos", "(61) 91785-3797", "ativo", "2026-05-02 01:10:44", "2026-06-16 01:10:44"],
            ["ALU-0018", "Felipe Costa", "usuario18@escola.edu.br", "(61) 99711-7597", "4A", "Carla Oliveira", "(61) 95244-1155", "ativo", "2026-03-28 01:10:44", "2026-06-17 01:10:44"],
            ["ALU-0019", "Carla Oliveira", "usuario19@escola.edu.br", "(61) 97206-5380", "1A", "Felipe Costa", "(61) 95081-7852", "inativo", "2026-05-28 01:10:44", "2026-06-07 01:10:44"],
            ["ALU-0020", "Felipe Costa", "usuario20@escola.edu.br", "(61) 98678-9228", "3C", "Eduarda Lima", "(61) 98008-9529", "ativo", "2026-05-12 01:10:44", "2026-06-01 01:10:44"],
            ["ALU-0021", "Bruno Santos", "usuario21@escola.edu.br", "(61) 96007-7660", "3C", "Bruno Santos", "(61) 92302-2256", "ativo", "2026-06-09 01:10:44", "2026-06-16 01:10:44"],
            ["ALU-0022", "Ana Silva", "usuario22@escola.edu.br", "(61) 92385-5683", "5B", "Henrique Alves", "(61) 91175-7946", "ativo", "2026-04-20 01:10:44", "2026-06-06 01:10:44"],
            ["ALU-0023", "Bruno Santos", "usuario23@escola.edu.br", "(61) 97643-1227", "5B", "Diego Souza", "(61) 91119-7962", "ativo", "2026-05-20 01:10:44", "2026-05-29 01:10:44"],
            ["ALU-0024", "Ana Silva", "usuario24@escola.edu.br", "(61) 98350-3761", "5B", "Diego Souza", "(61) 93864-2230", "ativo", "2026-06-03 01:10:44", "2026-06-05 01:10:44"],
            ["ALU-0025", "Felipe Costa", "usuario25@escola.edu.br", "(61) 91834-7925", "4A", "Gabriela Rocha", "(61) 93793-7115", "ativo", "2026-05-08 01:10:44", "2026-05-23 01:10:44"],
            ["ALU-0026", "Diego Souza", "usuario26@escola.edu.br", "(61) 99832-2931", "3C", "Eduarda Lima", "(61) 98915-5809", "ativo", "2026-05-24 01:10:44", "2026-06-21 01:10:44"],
            ["ALU-0027", "Gabriela Rocha", "usuario27@escola.edu.br", "(61) 94562-5994", "5B", "Ana Silva", "(61) 98586-8999", "ativo", "2026-05-06 01:10:44", "2026-06-21 01:10:44"],
            ["ALU-0028", "Henrique Alves", "usuario28@escola.edu.br", "(61) 96382-5888", "3C", "Bruno Santos", "(61) 91084-6729", "ativo", "2026-04-30 01:10:44", "2026-06-10 01:10:44"],
            ["ALU-0029", "Ana Silva", "usuario29@escola.edu.br", "(61) 92660-8058", "4A", "Diego Souza", "(61) 92388-9668", "ativo", "2026-04-29 01:10:44", "2026-06-18 01:10:44"],
            ["ALU-0030", "Henrique Alves", "usuario30@escola.edu.br", "(61) 91113-3549", "3C", "Diego Souza", "(61) 98711-7477", "ativo", "2026-05-13 01:10:44", "2026-06-10 01:10:44"]
          ];
          sheet_ALUNOS.getRange(2, 1, d_sheet_ALUNOS.length, h_sheet_ALUNOS.length).setValues(d_sheet_ALUNOS);
          results.push('OK Alunos: ' + d_sheet_ALUNOS.length + ' registros');
        } catch (e) {
          results.push('ERRO Alunos: ' + e.message);
        }

        // Escolas
        try {
          var sheet_ESCOLAS = ss.getSheetByName('Escolas') || ss.insertSheet('Escolas');
          if (sheet_ESCOLAS.getLastRow() > 1) {
            sheet_ESCOLAS.deleteRows(2, sheet_ESCOLAS.getLastRow() - 1);
          }
          var h_sheet_ESCOLAS = ["ID", "Name", "Code", "Address", "City", "State", "Status", "CreatedAt", "UpdatedAt"];
          sheet_ESCOLAS.getRange(1, 1, 1, h_sheet_ESCOLAS.length).setValues([h_sheet_ESCOLAS]);
          var d_sheet_ESCOLAS = [
            ["ESC-0001", "Gabriela Rocha", "B", "C", "A", "D", "inativo", "2026-05-31 01:10:44", "2026-06-17 01:10:44"],
            ["ESC-0002", "Felipe Costa", "D", "A", "C", "B", "ativo", "2026-05-27 01:10:44", "2026-06-12 01:10:44"],
            ["ESC-0003", "Ana Silva", "B", "D", "D", "C", "ativo", "2026-05-31 01:10:44", "2026-05-31 01:10:44"],
            ["ESC-0004", "Diego Souza", "D", "C", "A", "D", "inativo", "2026-04-11 01:10:44", "2026-06-06 01:10:44"],
            ["ESC-0005", "Carla Oliveira", "C", "D", "D", "B", "ativo", "2026-06-07 01:10:44", "2026-05-27 01:10:44"],
            ["ESC-0006", "Ana Silva", "B", "B", "C", "A", "ativo", "2026-06-14 01:10:44", "2026-05-31 01:10:44"],
            ["ESC-0007", "Felipe Costa", "D", "A", "D", "D", "ativo", "2026-05-15 01:10:44", "2026-06-06 01:10:44"],
            ["ESC-0008", "Bruno Santos", "D", "B", "B", "B", "ativo", "2026-05-16 01:10:44", "2026-05-28 01:10:44"],
            ["ESC-0009", "Bruno Santos", "C", "B", "D", "B", "inativo", "2026-06-07 01:10:44", "2026-05-30 01:10:44"],
            ["ESC-0010", "Carla Oliveira", "B", "B", "B", "A", "ativo", "2026-04-30 01:10:44", "2026-06-20 01:10:44"],
            ["ESC-0011", "Eduarda Lima", "B", "B", "D", "A", "ativo", "2026-06-09 01:10:44", "2026-05-25 01:10:44"],
            ["ESC-0012", "Ana Silva", "D", "D", "C", "B", "ativo", "2026-05-08 01:10:44", "2026-06-08 01:10:44"],
            ["ESC-0013", "Henrique Alves", "A", "D", "A", "C", "ativo", "2026-05-17 01:10:44", "2026-06-10 01:10:44"],
            ["ESC-0014", "Eduarda Lima", "C", "D", "B", "C", "ativo", "2026-05-28 01:10:44", "2026-06-20 01:10:44"],
            ["ESC-0015", "Ana Silva", "A", "C", "B", "C", "inativo", "2026-05-16 01:10:44", "2026-05-23 01:10:44"],
            ["ESC-0016", "Bruno Santos", "D", "B", "C", "D", "ativo", "2026-05-09 01:10:44", "2026-06-12 01:10:44"],
            ["ESC-0017", "Bruno Santos", "A", "A", "B", "C", "ativo", "2026-05-05 01:10:44", "2026-05-29 01:10:44"],
            ["ESC-0018", "Felipe Costa", "B", "C", "B", "D", "ativo", "2026-06-07 01:10:44", "2026-06-17 01:10:44"],
            ["ESC-0019", "Bruno Santos", "A", "B", "B", "D", "ativo", "2026-06-11 01:10:44", "2026-05-22 01:10:44"],
            ["ESC-0020", "Felipe Costa", "C", "D", "B", "B", "ativo", "2026-06-04 01:10:44", "2026-06-15 01:10:44"],
            ["ESC-0021", "Gabriela Rocha", "C", "C", "C", "D", "ativo", "2026-04-26 01:10:44", "2026-06-19 01:10:44"],
            ["ESC-0022", "Henrique Alves", "D", "A", "B", "C", "ativo", "2026-05-14 01:10:44", "2026-06-20 01:10:44"],
            ["ESC-0023", "Ana Silva", "B", "D", "D", "A", "ativo", "2026-04-25 01:10:44", "2026-05-28 01:10:44"],
            ["ESC-0024", "Gabriela Rocha", "D", "D", "C", "B", "ativo", "2026-06-20 01:10:44", "2026-06-16 01:10:44"],
            ["ESC-0025", "Diego Souza", "A", "D", "C", "C", "ativo", "2026-05-14 01:10:44", "2026-05-30 01:10:44"],
            ["ESC-0026", "Eduarda Lima", "A", "B", "B", "A", "ativo", "2026-05-14 01:10:44", "2026-06-20 01:10:44"],
            ["ESC-0027", "Carla Oliveira", "C", "B", "C", "A", "ativo", "2026-05-25 01:10:44", "2026-06-04 01:10:44"],
            ["ESC-0028", "Bruno Santos", "A", "C", "C", "C", "ativo", "2026-04-11 01:10:44", "2026-06-13 01:10:44"],
            ["ESC-0029", "Carla Oliveira", "D", "C", "C", "A", "ativo", "2026-05-06 01:10:44", "2026-06-14 01:10:44"],
            ["ESC-0030", "Eduarda Lima", "B", "C", "A", "A", "inativo", "2026-03-29 01:10:44", "2026-06-13 01:10:44"]
          ];
          sheet_ESCOLAS.getRange(2, 1, d_sheet_ESCOLAS.length, h_sheet_ESCOLAS.length).setValues(d_sheet_ESCOLAS);
          results.push('OK Escolas: ' + d_sheet_ESCOLAS.length + ' registros');
        } catch (e) {
          results.push('ERRO Escolas: ' + e.message);
        }

        // Professores
        try {
          var sheet_PROFESSORES = ss.getSheetByName('Professores') || ss.insertSheet('Professores');
          if (sheet_PROFESSORES.getLastRow() > 1) {
            sheet_PROFESSORES.deleteRows(2, sheet_PROFESSORES.getLastRow() - 1);
          }
          var h_sheet_PROFESSORES = ["ID", "Name", "Email", "Phone", "Subject", "Status", "CreatedAt", "UpdatedAt"];
          sheet_PROFESSORES.getRange(1, 1, 1, h_sheet_PROFESSORES.length).setValues([h_sheet_PROFESSORES]);
          var d_sheet_PROFESSORES = [
            ["PRO-0001", "Diego Souza", "usuario1@escola.edu.br", "(61) 98244-4614", "C", "ativo", "2026-05-25 01:10:44", "2026-06-03 01:10:44"],
            ["PRO-0002", "Gabriela Rocha", "usuario2@escola.edu.br", "(61) 93550-8308", "B", "inativo", "2026-05-04 01:10:44", "2026-06-17 01:10:44"],
            ["PRO-0003", "Henrique Alves", "usuario3@escola.edu.br", "(61) 92535-9125", "B", "inativo", "2026-05-28 01:10:44", "2026-05-26 01:10:44"],
            ["PRO-0004", "Carla Oliveira", "usuario4@escola.edu.br", "(61) 94094-9036", "B", "ativo", "2026-06-18 01:10:44", "2026-06-12 01:10:44"],
            ["PRO-0005", "Carla Oliveira", "usuario5@escola.edu.br", "(61) 93911-7458", "B", "ativo", "2026-06-02 01:10:44", "2026-06-19 01:10:44"],
            ["PRO-0006", "Gabriela Rocha", "usuario6@escola.edu.br", "(61) 95018-8455", "D", "ativo", "2026-04-14 01:10:44", "2026-06-17 01:10:44"],
            ["PRO-0007", "Ana Silva", "usuario7@escola.edu.br", "(61) 92633-7191", "D", "ativo", "2026-06-06 01:10:44", "2026-05-26 01:10:44"],
            ["PRO-0008", "Ana Silva", "usuario8@escola.edu.br", "(61) 91716-3165", "B", "ativo", "2026-05-17 01:10:44", "2026-06-17 01:10:44"],
            ["PRO-0009", "Ana Silva", "usuario9@escola.edu.br", "(61) 91153-2742", "C", "ativo", "2026-05-26 01:10:44", "2026-06-17 01:10:44"],
            ["PRO-0010", "Henrique Alves", "usuario10@escola.edu.br", "(61) 98279-3672", "C", "ativo", "2026-04-20 01:10:44", "2026-06-17 01:10:44"],
            ["PRO-0011", "Diego Souza", "usuario11@escola.edu.br", "(61) 91915-9905", "C", "ativo", "2026-06-18 01:10:44", "2026-05-26 01:10:44"],
            ["PRO-0012", "Ana Silva", "usuario12@escola.edu.br", "(61) 92684-9923", "C", "ativo", "2026-04-16 01:10:44", "2026-05-24 01:10:44"],
            ["PRO-0013", "Gabriela Rocha", "usuario13@escola.edu.br", "(61) 93323-1019", "B", "ativo", "2026-05-22 01:10:44", "2026-06-08 01:10:44"],
            ["PRO-0014", "Gabriela Rocha", "usuario14@escola.edu.br", "(61) 93414-6788", "C", "ativo", "2026-03-25 01:10:44", "2026-06-09 01:10:44"],
            ["PRO-0015", "Bruno Santos", "usuario15@escola.edu.br", "(61) 99057-3778", "A", "ativo", "2026-06-07 01:10:44", "2026-05-22 01:10:44"],
            ["PRO-0016", "Eduarda Lima", "usuario16@escola.edu.br", "(61) 96854-2249", "C", "ativo", "2026-05-05 01:10:44", "2026-05-23 01:10:44"],
            ["PRO-0017", "Bruno Santos", "usuario17@escola.edu.br", "(61) 91710-3475", "B", "inativo", "2026-04-14 01:10:44", "2026-06-11 01:10:44"],
            ["PRO-0018", "Carla Oliveira", "usuario18@escola.edu.br", "(61) 97967-3461", "C", "ativo", "2026-05-07 01:10:44", "2026-05-24 01:10:44"],
            ["PRO-0019", "Bruno Santos", "usuario19@escola.edu.br", "(61) 95441-9179", "C", "ativo", "2026-06-11 01:10:44", "2026-05-27 01:10:44"],
            ["PRO-0020", "Ana Silva", "usuario20@escola.edu.br", "(61) 93435-3401", "C", "ativo", "2026-05-02 01:10:44", "2026-06-07 01:10:44"],
            ["PRO-0021", "Henrique Alves", "usuario21@escola.edu.br", "(61) 92102-2854", "D", "ativo", "2026-06-02 01:10:44", "2026-06-19 01:10:44"],
            ["PRO-0022", "Felipe Costa", "usuario22@escola.edu.br", "(61) 93089-3979", "D", "ativo", "2026-05-11 01:10:44", "2026-06-06 01:10:44"],
            ["PRO-0023", "Gabriela Rocha", "usuario23@escola.edu.br", "(61) 98885-7782", "C", "ativo", "2026-03-29 01:10:44", "2026-05-23 01:10:44"],
            ["PRO-0024", "Diego Souza", "usuario24@escola.edu.br", "(61) 97278-7859", "D", "inativo", "2026-04-13 01:10:44", "2026-06-04 01:10:44"],
            ["PRO-0025", "Diego Souza", "usuario25@escola.edu.br", "(61) 97301-2369", "D", "ativo", "2026-03-23 01:10:44", "2026-06-19 01:10:44"],
            ["PRO-0026", "Diego Souza", "usuario26@escola.edu.br", "(61) 96926-1046", "B", "ativo", "2026-05-05 01:10:44", "2026-06-04 01:10:44"],
            ["PRO-0027", "Henrique Alves", "usuario27@escola.edu.br", "(61) 93188-2804", "A", "ativo", "2026-05-05 01:10:44", "2026-05-25 01:10:44"],
            ["PRO-0028", "Carla Oliveira", "usuario28@escola.edu.br", "(61) 95828-8543", "B", "inativo", "2026-05-20 01:10:44", "2026-06-15 01:10:44"],
            ["PRO-0029", "Diego Souza", "usuario29@escola.edu.br", "(61) 91915-3257", "A", "ativo", "2026-05-03 01:10:44", "2026-05-29 01:10:44"],
            ["PRO-0030", "Ana Silva", "usuario30@escola.edu.br", "(61) 97958-7089", "A", "ativo", "2026-03-28 01:10:44", "2026-06-03 01:10:44"]
          ];
          sheet_PROFESSORES.getRange(2, 1, d_sheet_PROFESSORES.length, h_sheet_PROFESSORES.length).setValues(d_sheet_PROFESSORES);
          results.push('OK Professores: ' + d_sheet_PROFESSORES.length + ' registros');
        } catch (e) {
          results.push('ERRO Professores: ' + e.message);
        }

        // DB_Educacional
        try {
          var sheet_NAME = ss.getSheetByName('DB_Educacional') || ss.insertSheet('DB_Educacional');
          if (sheet_NAME.getLastRow() > 1) {
            sheet_NAME.deleteRows(2, sheet_NAME.getLastRow() - 1);
          }
          var h_sheet_NAME = ["ID", "Name", "Description", "Status", "CreatedAt", "UpdatedAt"];
          sheet_NAME.getRange(1, 1, 1, h_sheet_NAME.length).setValues([h_sheet_NAME]);
          var d_sheet_NAME = [
            ["NAM-0001", "Bruno Santos", "Acompanhamento de evolução", "ativo", "2026-06-17 01:10:44", "2026-06-17 01:10:44"],
            ["NAM-0002", "Felipe Costa", "Dados coletados durante atividade", "ativo", "2026-05-20 01:10:44", "2026-06-19 01:10:44"],
            ["NAM-0003", "Ana Silva", "Acompanhamento de evolução", "ativo", "2026-05-28 01:10:44", "2026-06-06 01:10:44"],
            ["NAM-0004", "Carla Oliveira", "Registro de sessão experimental", "inativo", "2026-04-29 01:10:44", "2026-05-29 01:10:44"],
            ["NAM-0005", "Felipe Costa", "Acompanhamento de evolução", "ativo", "2026-05-15 01:10:44", "2026-06-18 01:10:44"],
            ["NAM-0006", "Carla Oliveira", "Observação inicial do processo", "ativo", "2026-04-04 01:10:44", "2026-05-28 01:10:44"],
            ["NAM-0007", "Carla Oliveira", "Dados coletados durante atividade", "ativo", "2026-05-01 01:10:44", "2026-05-26 01:10:44"],
            ["NAM-0008", "Gabriela Rocha", "Acompanhamento de evolução", "ativo", "2026-04-08 01:10:44", "2026-06-05 01:10:44"],
            ["NAM-0009", "Eduarda Lima", "Dados coletados durante atividade", "inativo", "2026-05-31 01:10:44", "2026-06-13 01:10:44"],
            ["NAM-0010", "Bruno Santos", "Acompanhamento de evolução", "ativo", "2026-05-24 01:10:44", "2026-06-09 01:10:44"],
            ["NAM-0011", "Ana Silva", "Dados coletados durante atividade", "inativo", "2026-05-28 01:10:44", "2026-05-26 01:10:44"],
            ["NAM-0012", "Bruno Santos", "Acompanhamento de evolução", "inativo", "2026-05-11 01:10:44", "2026-06-01 01:10:44"],
            ["NAM-0013", "Gabriela Rocha", "Acompanhamento de evolução", "ativo", "2026-06-14 01:10:44", "2026-05-27 01:10:44"],
            ["NAM-0014", "Felipe Costa", "Acompanhamento de evolução", "ativo", "2026-05-17 01:10:44", "2026-06-18 01:10:44"],
            ["NAM-0015", "Bruno Santos", "Observação inicial do processo", "ativo", "2026-04-04 01:10:44", "2026-05-28 01:10:44"],
            ["NAM-0016", "Felipe Costa", "Observação inicial do processo", "ativo", "2026-05-15 01:10:44", "2026-06-16 01:10:44"],
            ["NAM-0017", "Bruno Santos", "Observação inicial do processo", "ativo", "2026-04-05 01:10:44", "2026-06-21 01:10:44"],
            ["NAM-0018", "Eduarda Lima", "Dados coletados durante atividade", "ativo", "2026-03-31 01:10:44", "2026-05-23 01:10:44"],
            ["NAM-0019", "Ana Silva", "Dados coletados durante atividade", "ativo", "2026-06-10 01:10:44", "2026-06-03 01:10:44"],
            ["NAM-0020", "Ana Silva", "Acompanhamento de evolução", "ativo", "2026-06-14 01:10:44", "2026-06-11 01:10:44"],
            ["NAM-0021", "Bruno Santos", "Registro de sessão experimental", "ativo", "2026-05-06 01:10:44", "2026-05-28 01:10:44"],
            ["NAM-0022", "Eduarda Lima", "Acompanhamento de evolução", "ativo", "2026-05-11 01:10:44", "2026-05-28 01:10:44"],
            ["NAM-0023", "Gabriela Rocha", "Registro de sessão experimental", "ativo", "2026-03-23 01:10:44", "2026-05-31 01:10:44"],
            ["NAM-0024", "Bruno Santos", "Registro de sessão experimental", "inativo", "2026-04-17 01:10:44", "2026-06-18 01:10:44"],
            ["NAM-0025", "Carla Oliveira", "Observação inicial do processo", "inativo", "2026-04-20 01:10:44", "2026-06-03 01:10:44"],
            ["NAM-0026", "Ana Silva", "Registro de sessão experimental", "ativo", "2026-06-01 01:10:44", "2026-05-31 01:10:44"],
            ["NAM-0027", "Henrique Alves", "Observação inicial do processo", "ativo", "2026-05-22 01:10:44", "2026-05-24 01:10:44"],
            ["NAM-0028", "Diego Souza", "Dados coletados durante atividade", "ativo", "2026-04-17 01:10:44", "2026-06-05 01:10:44"],
            ["NAM-0029", "Felipe Costa", "Acompanhamento de evolução", "ativo", "2026-05-08 01:10:44", "2026-06-12 01:10:44"],
            ["NAM-0030", "Felipe Costa", "Acompanhamento de evolução", "ativo", "2026-03-25 01:10:44", "2026-06-09 01:10:44"]
          ];
          sheet_NAME.getRange(2, 1, d_sheet_NAME.length, h_sheet_NAME.length).setValues(d_sheet_NAME);
          results.push('OK DB_Educacional: ' + d_sheet_NAME.length + ' registros');
        } catch (e) {
          results.push('ERRO DB_Educacional: ' + e.message);
        }

        Logger.log(results.join('\n'));
        return results;
      } catch (error) {
        Logger.log("Erro em populateSyntheticData: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em populateSyntheticData: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em populateSyntheticData: " + error.message);
    throw error;
  }
}
