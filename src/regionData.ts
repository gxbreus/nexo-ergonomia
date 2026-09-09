import { bodyRegions } from './workflowData';

// Transcrição da planilha “Regiões corporais — Índice de compatibilidade”.
const rows = [
  ['Anterior;posterior;lateral', 'Flexão;Extensão;Rotação;Inclinação lateral;Postura sustentada;Vibração de corpo inteiro'],
  ['Região escapular direita;Região escapular esquerda;Interescapular', 'Flexão do tronco;Extensão;Rotação;Inclinação;Alcance;Postura sustentada;Movimentação de carga'],
  ['Lombar;Lombossacral', 'Flexão do tronco;Extensão;Rotação;Inclinação;Levantamento;Empurrar;Puxar;Carga;Vibração de corpo inteiro'],
  ['Anterior;Lateral;Posterior', 'Elevação do braço;Abdução;Adução;Rotação;Alcance acima do ombro;Força;Postura sustentada'],
  ['Anterior;Posterior', 'Elevação;Flexão;Extensão;Esforço sustentado;Carga'],
  ['Medial;Lateral;Posterior', 'Flexão;Extensão;Pronação;Supinação;Força;Repetição'],
  ['Anterior;Posterior', 'Pronação;Supinação;Flexão;Extensão;Preensão;Força sustentada;Repetição'],
  ['Palmar;Dorsal;Radial;Ulnar', 'Flexão;Extensão;Desvio radial;Desvio ulnar;Torção;Preensão;Repetição;Vibração mãos-braços'],
  ['Palma;Dorso;Região tenar;Região hipotenar', 'Preensão;Pinça;Apertar;Segurar;Impacto;Contato mecânico;Repetição;Vibração mãos-braços'],
  ['Polegar;Indicador;Médio;Anelar;Mínimo', 'Pinça;Digitação;Acionamento;Flexão;Extensão;Preensão;Repetição;Contato mecânico'],
  ['Quadril;Glútea;Lateral', 'Flexão;Extensão;Abdução;Adução;Rotação;Postura sentada;Caminhada;Carga'],
  ['Anterior;Posterior;Medial;Lateral', 'Flexão;Extensão;Agachamento;Caminhada;Subida;Postura sustentada;Carga'],
  ['Anterior;Posterior;Medial;Lateral', 'Flexão;Extensão;Agachamento;Ajoelhamento;Caminhada;Subida;Carga;Impacto'],
  ['Anterior;Posterior;Medial;Lateral', 'Caminhada;Permanência em pé;Flexão plantar;Dorsiflexão;Carga;Repetição'],
  ['Medial;Lateral;Anterior;Posterior', 'Dorsiflexão;Flexão plantar;Inversão;Eversão;Caminhada;Equilíbrio;Impacto'],
  ['Planta;Dorso;Arco;Calcanhar', 'Apoio;Caminhada;Permanência em pé;Impacto;Pressão localizada;Equilíbrio'],
  ['Hálux;Segundo;Terceiro;Quarto;Quinto', 'Apoio;Equilíbrio;Pressão do calçado;Flexão;Extensão;Caminhada'],
];
export const regionData = bodyRegions.map((name, index) => ({
  name, code: `RC${String(index + 1).padStart(2, '0')}`,
  central: index < 3, subregions: rows[index][0].split(';'), movements: rows[index][1].split(';'),
}));
