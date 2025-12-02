import { jsPDF } from "jspdf";
import type { StructuredResume } from "@/app/api/resume/parse/route";

// Helper para ordenar experiências por data (mais recente primeiro)
export function sortExperiencesByDate(experiences: StructuredResume["experiencias"]) {
  return [...experiences].sort((a, b) => {
    // Extrair ano final de cada período
    const getEndYear = (periodo: string) => {
      if (periodo.toLowerCase().includes('atual') || periodo.toLowerCase().includes('presente')) {
        return 9999;
      }
      const years = periodo.match(/\d{4}/g);
      return years ? parseInt(years[years.length - 1]) : 0;
    };

    return getEndYear(b.periodo) - getEndYear(a.periodo);
  });
}

// Helper para normalizar habilidades (sempre retorna objetos)
function normalizeSkills(skills: Array<string | { name: string; level?: string }>) {
  return skills.map(skill =>
    typeof skill === "string" ? { name: skill, level: undefined } : skill
  );
}

// Helper para formatar habilidades com ou sem níveis
function formatSkills(
  skills: Array<string | { name: string; level?: string }>,
  showLevels: boolean = false,
  separator: string = " • "
): string {
  const normalized = normalizeSkills(skills);
  return normalized
    .map(skill => {
      if (showLevels && skill.level) {
        return `${skill.name} (${skill.level})`;
      }
      return skill.name;
    })
    .join(separator);
}

// Template Clássico (atual, mais simples)
export function generateClassicTemplate(resumeData: StructuredResume): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  let yPos = 20;

  const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setTextColor(r, g, b);

    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.35;

    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
    yPos += 2;
  };

  const addSpace = (space: number) => {
    yPos += space;
  };

  // Adicionar texto com suporte para múltiplos parágrafos separados por " | "
  const addTextWithParagraphs = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000') => {
    if (!text) return;

    // Dividir por " | " para obter os parágrafos
    const paragraphs = text.split(' | ').filter(p => p.trim());

    paragraphs.forEach((paragraph, index) => {
      addText(paragraph.trim(), fontSize, isBold, color);
      // Adicionar espaço entre parágrafos (exceto no último)
      if (index < paragraphs.length - 1) {
        addSpace(2);
      }
    });
  };

  // Adicionar lista de itens em múltiplas colunas
  const addItemsInColumns = (items: string[], fontSize: number, numColumns: number = 4, color: string = '#333333') => {
    if (!items || items.length === 0) return;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setTextColor(r, g, b);

    const columnWidth = maxWidth / numColumns;
    const lineHeight = fontSize * 0.35;
    const startY = yPos;

    // Calcular quantos itens por coluna
    const itemsPerColumn = Math.ceil(items.length / numColumns);

    for (let col = 0; col < numColumns; col++) {
      const startIdx = col * itemsPerColumn;
      const endIdx = Math.min(startIdx + itemsPerColumn, items.length);
      const columnItems = items.slice(startIdx, endIdx);

      let currentY = startY;
      const xPos = margin + (col * columnWidth);

      columnItems.forEach(item => {
        if (currentY > 280) {
          doc.addPage();
          currentY = 20;
        }
        // Truncar item se for muito longo para a coluna
        const truncatedItem = item.length > 25 ? item.substring(0, 22) + '...' : item;
        doc.text(`• ${truncatedItem}`, xPos, currentY);
        currentY += lineHeight + 1;
      });

      // Atualizar yPos para a maior altura usada
      if (currentY - startY > yPos - startY) {
        yPos = currentY;
      }
    }

    // Garantir que yPos esteja após todas as colunas
    yPos = Math.max(yPos, startY + (itemsPerColumn * (lineHeight + 1)));
    yPos += 2;
  };

  // Cabeçalho - Nome e contato
  addText(resumeData.personalInfo.nome || 'Nome não informado', 22, true, '#1a1a1a');
  addSpace(3);

  if (resumeData.personalInfo.email) addText(resumeData.personalInfo.email, 9, false, '#555555');
  if (resumeData.personalInfo.telefone) addText(resumeData.personalInfo.telefone, 9, false, '#555555');
  if (resumeData.personalInfo.linkedin) addText(resumeData.personalInfo.linkedin, 9, false, '#555555');
  if (resumeData.personalInfo.github) addText(resumeData.personalInfo.github, 9, false, '#555555');
  addSpace(6);

  // Resumo Profissional
  if (resumeData.resumoProfissional) {
    addText('RESUMO PROFISSIONAL', 13, true, '#2563eb');
    addSpace(2);
    addTextWithParagraphs(resumeData.resumoProfissional, 10, false, '#333333');
    addSpace(6);
  }

  // Experiências Profissionais (ordenadas)
  const sortedExperiences = sortExperiencesByDate(resumeData.experiencias);

  if (sortedExperiences.length > 0) {
    addText('EXPERIÊNCIA PROFISSIONAL', 13, true, '#2563eb');
    addSpace(2);

    sortedExperiences.forEach(exp => {
      addText(exp.cargo || '', 11, true, '#1a1a1a');
      addText(`${exp.empresa || ''} | ${exp.periodo || ''}`, 9, false, '#666666');
      if (exp.descricao) addTextWithParagraphs(exp.descricao, 9, false, '#333333');
      if (exp.responsabilidades?.length > 0) {
        exp.responsabilidades.forEach(resp => addText(`• ${resp}`, 9, false, '#333333'));
      }
      addSpace(4);
    });
    addSpace(2);
  }

  // Educação
  if (resumeData.educacao?.length > 0) {
    addText('EDUCAÇÃO', 13, true, '#2563eb');
    addSpace(2);
    resumeData.educacao.forEach(edu => {
      addText(edu.curso || '', 11, true, '#1a1a1a');
      addText(`${edu.instituicao || ''} | ${edu.periodo || ''}`, 9, false, '#666666');
      if (edu.descricao) addTextWithParagraphs(edu.descricao, 9, false, '#333333');
      addSpace(4);
    });
    addSpace(2);
  }

  // Habilidades
  if (resumeData.habilidades?.tecnicas?.length > 0 || resumeData.habilidades?.idiomas?.length > 0) {
    addText('HABILIDADES', 13, true, '#2563eb');
    addSpace(2);
    if (resumeData.habilidades.tecnicas?.length > 0) {
      addText('Técnicas:', 10, true, '#1a1a1a');
      addSpace(1);

      // Converter habilidades para array de strings
      const normalized = normalizeSkills(resumeData.habilidades.tecnicas);
      const skillStrings = normalized.map(skill => {
        if (resumeData.showSkillLevels && skill.level) {
          return `${skill.name} (${skill.level})`;
        }
        return skill.name;
      });

      // Renderizar em 4 colunas
      addItemsInColumns(skillStrings, 9, 4, '#333333');
      addSpace(3);
    }
    if (resumeData.habilidades.idiomas?.length > 0) {
      addText('Idiomas:', 10, true, '#1a1a1a');
      addText(resumeData.habilidades.idiomas.join(' • '), 9, false, '#333333');
      addSpace(3);
    }
    addSpace(2);
  }

  // Projetos
  if (resumeData.projetos?.length > 0) {
    addText('PROJETOS', 13, true, '#2563eb');
    addSpace(2);
    resumeData.projetos.forEach(proj => {
      addText(proj.nome || '', 11, true, '#1a1a1a');
      if (proj.descricao) addTextWithParagraphs(proj.descricao, 9, false, '#333333');
      if (proj.tecnologias?.length > 0) addText(`Tecnologias: ${proj.tecnologias.join(', ')}`, 8, false, '#666666');
      addSpace(4);
    });
    addSpace(2);
  }

  // Certificações
  if (resumeData.certificacoes?.length > 0) {
    addText('CERTIFICAÇÕES', 13, true, '#2563eb');
    addSpace(2);
    resumeData.certificacoes.forEach(cert => addText(`• ${cert}`, 9, false, '#333333'));
  }

  return doc;
}

// Template Moderno (com sidebar e cores vibrantes)
export function generateModernTemplate(resumeData: StructuredResume): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Sidebar azul à esquerda
  doc.setFillColor(37, 99, 235); // #2563eb
  doc.rect(0, 0, 65, pageHeight, 'F');

  let yPos = 20;
  let ySidebar = 20;
  const mainMargin = 75;
  const sidebarMargin = 10;

  const addTextSidebar = (text: string, fontSize: number, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(255, 255, 255);
    const lines = doc.splitTextToSize(text, 45);
    lines.forEach((line: string) => {
      if (ySidebar > 280) {
        doc.addPage();
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 65, pageHeight, 'F');
        ySidebar = 20;
      }
      doc.text(line, sidebarMargin, ySidebar);
      ySidebar += fontSize * 0.4;
    });
    ySidebar += 3;
  };

  const addTextMain = (text: string, fontSize: number, isBold: boolean = false, color: string = '#1a1a1a') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setTextColor(r, g, b);

    const maxWidth = pageWidth - mainMargin - 15;
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 65, pageHeight, 'F');
        yPos = 20;
      }
      doc.text(line, mainMargin, yPos);
      yPos += fontSize * 0.4;
    });
    yPos += 3;
  };

  // Sidebar - Informações de contato
  addTextSidebar('CONTATO', 12, true);
  ySidebar += 5;
  if (resumeData.personalInfo.email) {
    addTextSidebar('Email', 9, true);
    addTextSidebar(resumeData.personalInfo.email, 8);
    ySidebar += 3;
  }
  if (resumeData.personalInfo.telefone) {
    addTextSidebar('Telefone', 9, true);
    addTextSidebar(resumeData.personalInfo.telefone, 8);
    ySidebar += 3;
  }
  if (resumeData.personalInfo.linkedin) {
    addTextSidebar('LinkedIn', 9, true);
    addTextSidebar(resumeData.personalInfo.linkedin.replace('https://www.linkedin.com/in/', ''), 8);
    ySidebar += 3;
  }
  if (resumeData.personalInfo.github) {
    addTextSidebar('GitHub', 9, true);
    addTextSidebar(resumeData.personalInfo.github.replace('https://github.com/', ''), 8);
    ySidebar += 3;
  }

  // Sidebar - Habilidades
  if (resumeData.habilidades?.tecnicas?.length > 0) {
    ySidebar += 5;
    addTextSidebar('HABILIDADES', 12, true);
    ySidebar += 5;
    const normalizedSkills = normalizeSkills(resumeData.habilidades.tecnicas);
    normalizedSkills.forEach(skill => {
      const skillText = resumeData.showSkillLevels && skill.level
        ? `• ${skill.name} (${skill.level})`
        : `• ${skill.name}`;
      addTextSidebar(skillText, 8);
    });
  }

  // Sidebar - Idiomas
  if (resumeData.habilidades?.idiomas?.length > 0) {
    ySidebar += 5;
    addTextSidebar('IDIOMAS', 12, true);
    ySidebar += 5;
    resumeData.habilidades.idiomas.forEach(lang => {
      addTextSidebar(`• ${lang}`, 8);
    });
  }

  // Área principal - Nome
  addTextMain(resumeData.personalInfo.nome || 'Nome não informado', 24, true, '#2563eb');
  yPos += 2;

  // Resumo
  if (resumeData.resumoProfissional) {
    addTextMain(resumeData.resumoProfissional, 10, false, '#444444');
    yPos += 5;
  }

  // Experiências (ordenadas)
  const sortedExperiences = sortExperiencesByDate(resumeData.experiencias);
  if (sortedExperiences.length > 0) {
    addTextMain('EXPERIÊNCIA PROFISSIONAL', 14, true, '#2563eb');
    yPos += 3;

    sortedExperiences.forEach(exp => {
      addTextMain(exp.cargo || '', 12, true, '#1a1a1a');
      addTextMain(`${exp.empresa || ''} | ${exp.periodo || ''}`, 9, false, '#666666');
      if (exp.descricao) addTextMain(exp.descricao, 9, false, '#444444');
      if (exp.responsabilidades?.length > 0) {
        exp.responsabilidades.forEach(resp => addTextMain(`• ${resp}`, 9, false, '#444444'));
      }
      yPos += 4;
    });
  }

  // Educação
  if (resumeData.educacao?.length > 0) {
    addTextMain('EDUCAÇÃO', 14, true, '#2563eb');
    yPos += 3;
    resumeData.educacao.forEach(edu => {
      addTextMain(edu.curso || '', 12, true, '#1a1a1a');
      addTextMain(`${edu.instituicao || ''} | ${edu.periodo || ''}`, 9, false, '#666666');
      if (edu.descricao) addTextMain(edu.descricao, 9, false, '#444444');
      yPos += 4;
    });
  }

  // Projetos
  if (resumeData.projetos?.length > 0) {
    addTextMain('PROJETOS', 14, true, '#2563eb');
    yPos += 3;
    resumeData.projetos.forEach(proj => {
      addTextMain(proj.nome || '', 11, true, '#1a1a1a');
      if (proj.descricao) addTextMain(proj.descricao, 9, false, '#444444');
      if (proj.tecnologias?.length > 0) addTextMain(proj.tecnologias.join(' • '), 8, false, '#666666');
      yPos += 4;
    });
  }

  // Certificações
  if (resumeData.certificacoes?.length > 0) {
    addTextMain('CERTIFICAÇÕES', 14, true, '#2563eb');
    yPos += 3;
    resumeData.certificacoes.forEach(cert => addTextMain(`• ${cert}`, 9, false, '#444444'));
  }

  return doc;
}

// Template Minimalista (clean e elegante)
export function generateMinimalTemplate(resumeData: StructuredResume): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPos = 30;

  const addLine = (y: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000', align: 'left' | 'center' = 'left') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setTextColor(r, g, b);

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 30;
      }
      const x = align === 'center' ? pageWidth / 2 : margin;
      doc.text(line, x, yPos, { align });
      yPos += fontSize * 0.4;
    });
    yPos += 2;
  };

  // Nome centralizado
  addText(resumeData.personalInfo.nome || 'Nome não informado', 22, true, '#1a1a1a', 'center');
  yPos += 2;

  // Contatos centralizados
  const contacts = [
    resumeData.personalInfo.email,
    resumeData.personalInfo.telefone,
    resumeData.personalInfo.linkedin,
    resumeData.personalInfo.github
  ].filter(Boolean);

  if (contacts.length > 0) {
    addText(contacts.join('  |  '), 9, false, '#666666', 'center');
  }

  yPos += 5;
  addLine(yPos);
  yPos += 8;

  // Resumo
  if (resumeData.resumoProfissional) {
    addText(resumeData.resumoProfissional, 10, false, '#444444');
    yPos += 5;
  }

  // Experiências (ordenadas)
  const sortedExperiences = sortExperiencesByDate(resumeData.experiencias);
  if (sortedExperiences.length > 0) {
    addText('Experiência Profissional', 13, true, '#1a1a1a');
    yPos += 2;
    addLine(yPos);
    yPos += 5;

    sortedExperiences.forEach(exp => {
      addText(exp.cargo || '', 11, true, '#1a1a1a');
      addText(`${exp.empresa || ''} · ${exp.periodo || ''}`, 9, false, '#666666');
      if (exp.descricao) addText(exp.descricao, 9, false, '#444444');
      if (exp.responsabilidades?.length > 0) {
        exp.responsabilidades.forEach(resp => addText(`  • ${resp}`, 9, false, '#444444'));
      }
      yPos += 4;
    });
  }

  // Educação
  if (resumeData.educacao?.length > 0) {
    addText('Educação', 13, true, '#1a1a1a');
    yPos += 2;
    addLine(yPos);
    yPos += 5;

    resumeData.educacao.forEach(edu => {
      addText(edu.curso || '', 11, true, '#1a1a1a');
      addText(`${edu.instituicao || ''} · ${edu.periodo || ''}`, 9, false, '#666666');
      if (edu.descricao) addText(edu.descricao, 9, false, '#444444');
      yPos += 4;
    });
  }

  // Habilidades em grid
  if (resumeData.habilidades?.tecnicas?.length > 0) {
    addText('Habilidades', 13, true, '#1a1a1a');
    yPos += 2;
    addLine(yPos);
    yPos += 5;
    addText(formatSkills(resumeData.habilidades.tecnicas, resumeData.showSkillLevels, '  ·  '), 9, false, '#444444');
    yPos += 5;
  }

  // Projetos
  if (resumeData.projetos?.length > 0) {
    addText('Projetos', 13, true, '#1a1a1a');
    yPos += 2;
    addLine(yPos);
    yPos += 5;

    resumeData.projetos.forEach(proj => {
      addText(proj.nome || '', 11, true, '#1a1a1a');
      if (proj.descricao) addText(proj.descricao, 9, false, '#444444');
      if (proj.tecnologias?.length > 0) addText(proj.tecnologias.join(' · '), 8, false, '#666666');
      yPos += 4;
    });
  }

  return doc;
}

// Template Profissional (formal e corporativo)
export function generateProfessionalTemplate(resumeData: StructuredResume): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  let yPos = 20;

  // Cabeçalho com fundo cinza
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 0, pageWidth, 45, 'F');

  const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    doc.setTextColor(r, g, b);

    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.4;
    });
    yPos += 2;
  };

  const addSectionHeader = (title: string) => {
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, yPos - 5, 40, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 2, yPos);
    yPos += 8;
  };

  // Nome e contatos no cabeçalho
  addText(resumeData.personalInfo.nome || 'Nome não informado', 20, true, '#1a1a1a');

  const contactInfo = [
    resumeData.personalInfo.email,
    resumeData.personalInfo.telefone
  ].filter(Boolean).join(' | ');

  if (contactInfo) {
    addText(contactInfo, 9, false, '#555555');
  }

  const linksInfo = [
    resumeData.personalInfo.linkedin,
    resumeData.personalInfo.github
  ].filter(Boolean).join(' | ');

  if (linksInfo) {
    addText(linksInfo, 9, false, '#555555');
  }

  yPos = 50;

  // Resumo
  if (resumeData.resumoProfissional) {
    addSectionHeader('PERFIL');
    addText(resumeData.resumoProfissional, 10, false, '#333333');
    yPos += 4;
  }

  // Experiências (ordenadas)
  const sortedExperiences = sortExperiencesByDate(resumeData.experiencias);
  if (sortedExperiences.length > 0) {
    addSectionHeader('EXPERIÊNCIA');

    sortedExperiences.forEach(exp => {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos - 3, maxWidth, 6, 'F');

      addText(exp.cargo || '', 11, true, '#1a1a1a');
      yPos -= 2;
      addText(`${exp.empresa || ''} | ${exp.periodo || ''}`, 9, false, '#666666');
      if (exp.descricao) addText(exp.descricao, 9, false, '#444444');
      if (exp.responsabilidades?.length > 0) {
        exp.responsabilidades.forEach(resp => addText(`• ${resp}`, 9, false, '#444444'));
      }
      yPos += 3;
    });
  }

  // Educação
  if (resumeData.educacao?.length > 0) {
    addSectionHeader('EDUCAÇÃO');

    resumeData.educacao.forEach(edu => {
      addText(edu.curso || '', 11, true, '#1a1a1a');
      addText(`${edu.instituicao || ''} | ${edu.periodo || ''}`, 9, false, '#666666');
      if (edu.descricao) addText(edu.descricao, 9, false, '#444444');
      yPos += 3;
    });
  }

  // Habilidades
  if (resumeData.habilidades?.tecnicas?.length > 0) {
    addSectionHeader('COMPETÊNCIAS');

    // Dividir habilidades em colunas
    const normalizedSkills = normalizeSkills(resumeData.habilidades.tecnicas);
    const formattedSkills = normalizedSkills.map(skill => {
      if (resumeData.showSkillLevels && skill.level) {
        return `${skill.name} (${skill.level})`;
      }
      return skill.name;
    });

    const skillsPerRow = 3;
    for (let i = 0; i < formattedSkills.length; i += skillsPerRow) {
      const rowSkills = formattedSkills.slice(i, i + skillsPerRow);
      addText(rowSkills.join('  •  '), 9, false, '#444444');
    }
    yPos += 3;
  }

  // Certificações
  if (resumeData.certificacoes?.length > 0) {
    addSectionHeader('CERTIFICAÇÕES');
    resumeData.certificacoes.forEach(cert => addText(`• ${cert}`, 9, false, '#444444'));
    yPos += 3;
  }

  // Projetos
  if (resumeData.projetos?.length > 0) {
    addSectionHeader('PROJETOS');
    resumeData.projetos.forEach(proj => {
      addText(proj.nome || '', 10, true, '#1a1a1a');
      if (proj.descricao) addText(proj.descricao, 9, false, '#444444');
      if (proj.tecnologias?.length > 0) addText(`Tecnologias: ${proj.tecnologias.join(', ')}`, 8, false, '#666666');
      yPos += 3;
    });
  }

  return doc;
}

export function generatePDFByTemplate(resumeData: StructuredResume, templateType: string): jsPDF {
  switch (templateType) {
    case 'modern':
      return generateModernTemplate(resumeData);
    case 'minimal':
      return generateMinimalTemplate(resumeData);
    case 'professional':
      return generateProfessionalTemplate(resumeData);
    case 'classic':
    default:
      return generateClassicTemplate(resumeData);
  }
}
