const fs = require('fs');
const path = require('path');

function replacePlaceholders() {
    console.log('iniciando build');
    
    const templatePath = path.join(__dirname, 'config.template.js');
    const outputPath = path.join(__dirname, 'config.js');
    
    if (!fs.existsSync(templatePath)) {
        console.error('Arquivo config.template.js nao encontrado');
        process.exit(1);
    }
    
    let template = fs.readFileSync(templatePath, 'utf8');
    
    const CLIENT_ID = process.env.CLIENT_ID;
    const REGION = process.env.REGION;
    const DOMAIN = process.env.DOMAIN;
    const AUTHORITY = process.env.AUTHORITY;
    const API_BASE_URL = process.env.API_BASE_URL;
    
    if (!CLIENT_ID || !REGION || !DOMAIN || !AUTHORITY || !API_BASE_URL) {
        console.error('variavel de ambiente nao encontrada');
        process.exit(1);
    }
    
    template = template.replace('{{CLIENT_ID}}', CLIENT_ID);
    template = template.replace('{{REGION}}', REGION);
    template = template.replace('{{DOMAIN}}', DOMAIN);
    template = template.replace('{{AUTHORITY}}', AUTHORITY);
    template = template.replace('{{API_BASE_URL}}', API_BASE_URL);
    
    fs.writeFileSync(outputPath, template);
    
    console.log('build concluido');
}

replacePlaceholders(); 