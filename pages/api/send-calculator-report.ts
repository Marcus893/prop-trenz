import type { NextApiRequest, NextApiResponse } from 'next'
import { jsPDF } from 'jspdf'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const REPORT_FROM_EMAIL = process.env.REPORT_FROM_EMAIL || 'PropTrenz Reports <reports@proptrenz.com>'
const LEAD_RECIPIENT = process.env.LEAD_RECIPIENT_EMAIL || 'proptrenz@gmail.com'

type CalculatorType = 'roi' | 'closing-cost' | 'ownership-cost' | 'seller-cost'

interface ReportRequestBody {
  email: string
  calculatorType: CalculatorType
  inputs: Record<string, unknown>
  results: Record<string, unknown>
  locale?: string
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0)
}

// Format percentage
function formatPercentage(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(2) : '0.00'}%`
}

// Get calculator display name
function getCalculatorName(type: CalculatorType, locale: string): string {
  const names: Record<CalculatorType, Record<string, string>> = {
    'roi': {
      en: 'Investment ROI Calculator',
      es: 'Calculadora de ROI de Inversión',
      zh: '投资回报率计算器'
    },
    'closing-cost': {
      en: 'Closing Cost Calculator',
      es: 'Calculadora de Costos de Cierre',
      zh: '交易费用计算器'
    },
    'ownership-cost': {
      en: 'Ownership Cost Calculator',
      es: 'Calculadora de Costos de Propiedad',
      zh: '持有成本计算器'
    },
    'seller-cost': {
      en: 'Seller Cost Calculator',
      es: 'Calculadora de Costos del Vendedor',
      zh: '卖家成本计算器'
    }
  }
  return names[type][locale] || names[type]['en']
}

// Get email subject
function getEmailSubject(type: CalculatorType, locale: string): string {
  const subjects: Record<string, Record<string, string>> = {
    'roi': {
      en: 'Your PropTrenz Investment ROI Report',
      es: 'Tu Reporte de ROI de Inversión de PropTrenz',
      zh: '您的PropTrenz投资回报率报告'
    },
    'closing-cost': {
      en: 'Your PropTrenz Closing Cost Report',
      es: 'Tu Reporte de Costos de Cierre de PropTrenz',
      zh: '您的PropTrenz交易费用报告'
    },
    'ownership-cost': {
      en: 'Your PropTrenz Ownership Cost Report',
      es: 'Tu Reporte de Costos de Propiedad de PropTrenz',
      zh: '您的PropTrenz持有成本报告'
    },
    'seller-cost': {
      en: 'Your PropTrenz Seller Cost Report',
      es: 'Tu Reporte de Costos del Vendedor de PropTrenz',
      zh: '您的PropTrenz卖家成本报告'
    }
  }
  return subjects[type]?.[locale] || subjects[type]?.['en'] || 'Your PropTrenz Calculator Report'
}

// Translation helper for PDF and email content
function getTranslation(key: string, locale: string): string {
  const translations: Record<string, Record<string, string>> = {
    'pdf_generated': {
      en: 'Generated:',
      es: 'Generado:',
      zh: '生成日期：'
    },
    'pdf_property_value': {
      en: 'Property Value',
      es: 'Valor de la Propiedad',
      zh: '房产价值'
    },
    'pdf_purchase_price': {
      en: 'Purchase Price',
      es: 'Precio de Compra',
      zh: '购买价格'
    },
    'pdf_annual_costs': {
      en: 'Annual Ownership Costs',
      es: 'Costos Anuales de Propiedad',
      zh: '年度持有成本'
    },
    'pdf_closing_costs': {
      en: 'Closing Cost Breakdown',
      es: 'Desglose de Costos de Cierre',
      zh: '交易费用明细'
    },
    'pdf_property_details': {
      en: 'Property Details',
      es: 'Detalles de la Propiedad',
      zh: '房产详情'
    },
    'pdf_mandatory_costs': {
      en: 'Mandatory Costs',
      es: 'Costos Obligatorios',
      zh: '必要费用'
    },
    'pdf_optional_costs': {
      en: 'Optional Costs',
      es: 'Costos Opcionales',
      zh: '可选费用'
    },
    'pdf_annual_total': {
      en: 'Annual Total',
      es: 'Total Anual',
      zh: '年度总计'
    },
    'pdf_monthly_average': {
      en: 'Monthly Average',
      es: 'Promedio Mensual',
      zh: '月均费用'
    },
    'pdf_total_closing_costs': {
      en: 'Total Closing Costs',
      es: 'Total de Costos de Cierre',
      zh: '交易费用总计'
    },
    'pdf_of_purchase_price': {
      en: 'of purchase price',
      es: 'del precio de compra',
      zh: '占购买价格'
    },
    'pdf_disclaimer': {
      en: 'This report is for informational purposes only and does not constitute financial advice.',
      es: 'Este reporte es solo para fines informativos y no constituye asesoramiento financiero.',
      zh: '本报告仅供参考，不构成财务建议。'
    },
    'pdf_investment_inputs': {
      en: 'Investment Inputs',
      es: 'Datos de Inversión',
      zh: '投资输入'
    },
    'pdf_investment_results': {
      en: 'Investment Results',
      es: 'Resultados de Inversión',
      zh: '投资结果'
    },
    'pdf_sale_details': {
      en: 'Sale Details',
      es: 'Detalles de Venta',
      zh: '销售详情'
    },
    'pdf_sale_price': {
      en: 'Sale Price',
      es: 'Precio de Venta',
      zh: '售价'
    },
    'pdf_seller_costs': {
      en: 'Seller Cost Breakdown',
      es: 'Desglose de Costos del Vendedor',
      zh: '卖家成本明细'
    },
    'pdf_net_proceeds': {
      en: 'Estimated Net Proceeds',
      es: 'Ganancias Netas Estimadas',
      zh: '预计净收益'
    },
    'email_greeting': {
      en: 'Hello,',
      es: 'Hola,',
      zh: '您好，'
    },
    'email_thanks': {
      en: 'Thank you for using PropTrenz! Your personalized report is attached to this email as a PDF.',
      es: '¡Gracias por usar PropTrenz! Tu reporte personalizado está adjunto a este correo como PDF.',
      zh: '感谢您使用PropTrenz！您的个性化报告已作为PDF附件发送到此邮件。'
    },
    'email_includes_title': {
      en: 'The report includes:',
      es: 'El reporte incluye:',
      zh: '报告包含：'
    },
    'email_includes_inputs': {
      en: 'All your input values',
      es: 'Todos tus valores ingresados',
      zh: '您输入的所有数值'
    },
    'email_includes_results': {
      en: 'Detailed calculation results',
      es: 'Resultados detallados del cálculo',
      zh: '详细的计算结果'
    },
    'email_includes_metrics': {
      en: 'Key metrics and insights',
      es: 'Métricas e información clave',
      zh: '关键指标和见解'
    },
    'email_cta_text': {
      en: 'Have questions about your results? Want to connect with a local real estate expert?',
      es: '¿Tienes preguntas sobre tus resultados? ¿Quieres conectar con un experto en bienes raíces local?',
      zh: '对您的结果有疑问？想与当地房地产专家联系？'
    },
    'email_cta_button': {
      en: 'Explore PropTrenz',
      es: 'Explorar PropTrenz',
      zh: '探索PropTrenz'
    },
    'email_disclaimer': {
      en: 'This report is for informational purposes only and does not constitute financial advice. Please consult with qualified professionals before making investment decisions.',
      es: 'Este reporte es solo para fines informativos y no constituye asesoramiento financiero. Por favor consulta con profesionales calificados antes de tomar decisiones de inversión.',
      zh: '本报告仅供参考，不构成财务建议。在做出投资决定前，请咨询专业人士。'
    },
    'email_footer': {
      en: 'Mexican Real Estate Data & Analytics',
      es: 'Datos y Análisis de Bienes Raíces en México',
      zh: '墨西哥房地产数据与分析'
    }
  }
  return translations[key]?.[locale] || translations[key]?.['en'] || key
}

// Get cost item labels for PDF
function getCostItemLabels(type: 'ownership' | 'closing' | 'seller', locale: string): Record<string, string> {
  const ownershipLabels: Record<string, Record<string, string>> = {
    propertyTaxes: { en: 'Property Tax (Predial)', es: 'Impuesto Predial', zh: '房产税' },
    hoaFees: { en: 'HOA / Maintenance Fees', es: 'Cuotas de Mantenimiento', zh: '物业管理费' },
    fideicomisoAnnual: { en: 'Fideicomiso Annual Fee', es: 'Cuota Anual de Fideicomiso', zh: '信托年费' },
    insurance: { en: 'Property Insurance', es: 'Seguro de Propiedad', zh: '房产保险' },
    utilities: { en: 'Utilities', es: 'Servicios', zh: '公共设施费' },
    maintenance: { en: 'General Maintenance', es: 'Mantenimiento General', zh: '一般维护费' },
    propertyManagement: { en: 'Property Management', es: 'Administración de Propiedad', zh: '物业管理' }
  }
  
  const closingLabels: Record<string, Record<string, string>> = {
    isai: { en: 'Property Acquisition Tax (ISAI)', es: 'Impuesto sobre Adquisición de Inmuebles (ISAI)', zh: '房产购置税 (ISAI)' },
    notaryFees: { en: 'Notary Fees', es: 'Honorarios Notariales', zh: '公证费' },
    registrationFees: { en: 'Property Registration Fees', es: 'Derechos de Registro', zh: '房产登记费' },
    fideicomisoSetup: { en: 'Fideicomiso Setup', es: 'Establecimiento de Fideicomiso', zh: '信托设立费' },
    foreignAffairsPermit: { en: 'Foreign Affairs Permit', es: 'Permiso de Relaciones Exteriores', zh: '外事许可证' },
    legalFees: { en: 'Legal / Attorney Services', es: 'Servicios Legales', zh: '法律服务费' },
    iva: { en: 'IVA (Value Added Tax)', es: 'IVA (Impuesto al Valor Agregado)', zh: '增值税' },
    appraisalFees: { en: 'Appraisal Fees', es: 'Avalúo', zh: '评估费' },
    titleInsurance: { en: 'Title Insurance', es: 'Seguro de Título', zh: '产权保险' },
    escrowFees: { en: 'Escrow Fees', es: 'Honorarios de Custodia', zh: '托管费' }
  }
  
  const sellerLabels: Record<string, Record<string, string>> = {
    capitalGainsTax: { en: 'Capital Gains Tax (ISR)', es: 'Impuesto sobre la Renta (ISR)', zh: '资本利得税' },
    agentCommission: { en: 'Agent Commission', es: 'Comisión del Agente', zh: '代理佣金' },
    fideicomisoCancellation: { en: 'Fideicomiso Cancellation', es: 'Cancelación de Fideicomiso', zh: '信托注销费' },
    attorneyFee: { en: 'Attorney Fee', es: 'Honorarios de Abogado', zh: '律师费' },
    totalCosts: { en: 'Total Estimated Costs', es: 'Costos Totales Estimados', zh: '预计总费用' },
    netProceeds: { en: 'Net Proceeds', es: 'Ganancias Netas', zh: '净收益' }
  }
  
  const labels = type === 'ownership' ? ownershipLabels : type === 'closing' ? closingLabels : sellerLabels
  
  const result: Record<string, string> = {}
  Object.entries(labels).forEach(([key, translations]) => {
    result[key] = translations[locale] || translations['en']
  })
  return result
}

// Note: PDF generation uses English-only text because jsPDF's default fonts (Helvetica, Courier, Times)
// do not support Chinese/Unicode characters. Embedding Unicode fonts would significantly increase file size.
// The email content remains in the user's preferred language.
const PDF_LOCALE = 'en'

// Generate PDF for ROI Calculator
function generateROIPDF(inputs: Record<string, string | number>, results: Record<string, number>, locale: string): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Colors - typed as tuples for spread operator
  const primaryBlue: [number, number, number] = [37, 99, 235] // blue-600
  const darkGray: [number, number, number] = [31, 41, 55] // gray-800
  const lightGray: [number, number, number] = [107, 114, 128] // gray-500
  const successGreen: [number, number, number] = [22, 163, 74] // green-600
  const errorRed: [number, number, number] = [220, 38, 38] // red-600
  
  let yPos = 20
  
  // Header
  doc.setFillColor(...primaryBlue)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('PropTrenz', 20, 25)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(getCalculatorName('roi', PDF_LOCALE), 20, 35)
  
  yPos = 55
  
  // Date - use English for PDF (jsPDF doesn't support Unicode fonts)
  doc.setTextColor(...lightGray)
  doc.setFontSize(10)
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`Generated: ${dateStr}`, 20, yPos)
  yPos += 15
  
  // Investment Summary Section
  doc.setTextColor(...darkGray)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Investment Summary', 20, yPos)
  yPos += 8
  
  doc.setDrawColor(...primaryBlue)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Input values
  const inputLabels: Record<string, string> = {
    purchasePrice: 'Purchase Price',
    closingCostPercent: 'Closing Costs (%)',
    renovationCosts: 'Renovation Costs',
    downPaymentPercent: 'Down Payment (%)',
    interestRate: 'Interest Rate (%)',
    loanTermYears: 'Loan Term (Years)',
    monthlyRent: 'Monthly Rent',
    otherMonthlyIncome: 'Other Monthly Income',
    occupancyRate: 'Occupancy Rate (%)',
    operatingExpensePercent: 'Operating Expenses (%)',
    managementPercent: 'Management Fee (%)',
    annualTaxes: 'Annual Property Taxes',
    annualInsurance: 'Annual Insurance',
    annualOtherExpenses: 'Other Annual Expenses',
    appreciationRate: 'Expected Appreciation (%)'
  }
  
  Object.entries(inputs).forEach(([key, value]) => {
    if (value && inputLabels[key]) {
      doc.setTextColor(...lightGray)
      doc.text(inputLabels[key], 25, yPos)
      doc.setTextColor(...darkGray)
      const displayValue = key.includes('Percent') || key.includes('Rate') || key === 'occupancyRate'
        ? `${value}%`
        : key.includes('Price') || key.includes('Costs') || key.includes('Rent') || key.includes('Income') || key.includes('Taxes') || key.includes('Insurance') || key.includes('Expenses')
          ? formatCurrency(Number(value))
          : String(value)
      doc.text(displayValue, pageWidth - 60, yPos)
      yPos += 7
    }
  })
  
  yPos += 10
  
  // Results Section
  doc.setTextColor(...darkGray)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Analysis Results', 20, yPos)
  yPos += 8
  
  doc.setDrawColor(...primaryBlue)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const resultLabels: Record<string, { label: string; format: 'currency' | 'percentage' }> = {
    totalCashInvested: { label: 'Total Cash Invested', format: 'currency' },
    loanAmount: { label: 'Loan Amount', format: 'currency' },
    annualGrossIncome: { label: 'Annual Gross Income', format: 'currency' },
    totalOperatingExpenses: { label: 'Total Operating Expenses', format: 'currency' },
    netOperatingIncome: { label: 'Net Operating Income (NOI)', format: 'currency' },
    annualDebtService: { label: 'Annual Debt Service', format: 'currency' },
    annualCashFlow: { label: 'Annual Cash Flow', format: 'currency' },
    capRate: { label: 'Cap Rate', format: 'percentage' },
    cashOnCash: { label: 'Cash-on-Cash Return', format: 'percentage' },
    totalRoi: { label: 'Total ROI (with Appreciation)', format: 'percentage' }
  }
  
  Object.entries(results).forEach(([key, value]) => {
    if (resultLabels[key]) {
      doc.setTextColor(...lightGray)
      doc.text(resultLabels[key].label, 25, yPos)
      
      const isPositive = value >= 0
      if (key === 'annualCashFlow' || key === 'capRate' || key === 'cashOnCash' || key === 'totalRoi') {
        doc.setTextColor(...(isPositive ? successGreen : errorRed))
      } else {
        doc.setTextColor(...darkGray)
      }
      
      const displayValue = resultLabels[key].format === 'percentage'
        ? formatPercentage(value)
        : formatCurrency(value)
      doc.text(displayValue, pageWidth - 60, yPos)
      yPos += 7
    }
  })
  
  yPos += 15
  
  // Key Metrics Highlight Box
  doc.setFillColor(243, 244, 246) // gray-100
  doc.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'F')
  yPos += 10
  
  doc.setTextColor(...darkGray)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Investment Metrics', 30, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const metrics = [
    { label: 'Cap Rate', value: formatPercentage(results.capRate || 0), x: 30 },
    { label: 'Cash-on-Cash', value: formatPercentage(results.cashOnCash || 0), x: 80 },
    { label: 'Annual Cash Flow', value: formatCurrency(results.annualCashFlow || 0), x: 140 }
  ]
  
  metrics.forEach(metric => {
    doc.setTextColor(...lightGray)
    doc.text(metric.label, metric.x, yPos)
    doc.setTextColor(...darkGray)
    doc.setFont('helvetica', 'bold')
    doc.text(metric.value, metric.x, yPos + 7)
    doc.setFont('helvetica', 'normal')
  })
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setTextColor(...lightGray)
  doc.setFontSize(8)
  doc.text('This report is for informational purposes only and does not constitute financial advice.', 20, footerY)
  doc.text('PropTrenz - proptrenz.com', 20, footerY + 5)
  
  return doc.output('datauristring').split(',')[1] // Return base64 without data URI prefix
}

// Generate PDF for Closing Cost Calculator
function generateClosingCostPDF(inputs: Record<string, string | number>, results: Record<string, unknown>, locale: string): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  const primaryBlue: [number, number, number] = [37, 99, 235]
  const darkGray: [number, number, number] = [31, 41, 55]
  const lightGray: [number, number, number] = [107, 114, 128]
  
  let yPos = 20
  
  // Header
  doc.setFillColor(...primaryBlue)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('PropTrenz', 20, 25)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(getCalculatorName('closing-cost', PDF_LOCALE), 20, 35)
  
  yPos = 55
  
  // Date - use English for PDF (jsPDF doesn't support Unicode fonts)
  doc.setTextColor(...lightGray)
  doc.setFontSize(10)
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`${getTranslation('pdf_generated', PDF_LOCALE)} ${dateStr}`, 20, yPos)
  yPos += 15
  
  // Property Details
  doc.setTextColor(...darkGray)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(getTranslation('pdf_property_details', PDF_LOCALE), 20, yPos)
  yPos += 8
  
  doc.setDrawColor(...primaryBlue)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  if (inputs.purchasePrice) {
    doc.setTextColor(...lightGray)
  doc.text(getTranslation('pdf_purchase_price', PDF_LOCALE), 25, yPos)
    doc.setTextColor(...darkGray)
    doc.text(formatCurrency(Number(inputs.purchasePrice)), pageWidth - 60, yPos)
    yPos += 10
  }
  
  yPos += 5
  
  // Cost Breakdown
  doc.setTextColor(...darkGray)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(getTranslation('pdf_closing_costs', PDF_LOCALE), 20, yPos)
  yPos += 8
  
  doc.setDrawColor(...primaryBlue)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Get breakdown from results
  const breakdown = (results.breakdown as Record<string, number>) || {}
  const costLabels = getCostItemLabels('closing', PDF_LOCALE)
  
  Object.entries(breakdown).forEach(([key, value]) => {
    if (costLabels[key] && value > 0) {
      doc.setTextColor(...lightGray)
      doc.text(costLabels[key], 25, yPos)
      doc.setTextColor(...darkGray)
      doc.text(formatCurrency(value), pageWidth - 60, yPos)
      yPos += 7
    }
  })
  
  yPos += 10
  
  // Totals Box
  const total = typeof results.total === 'number' ? results.total : 0
  const requiredCosts = typeof results.required === 'number' ? results.required : 0
  const optionalCosts = typeof results.optional === 'number' ? results.optional : 0
  
  doc.setFillColor(243, 244, 246)
  doc.roundedRect(20, yPos, pageWidth - 40, 50, 3, 3, 'F')
  yPos += 12
  
  doc.setTextColor(...darkGray)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  
  doc.text(getTranslation('pdf_mandatory_costs', PDF_LOCALE), 30, yPos)
  doc.text(formatCurrency(requiredCosts), pageWidth - 70, yPos)
  yPos += 12
  
  doc.text(getTranslation('pdf_optional_costs', PDF_LOCALE), 30, yPos)
  doc.text(formatCurrency(optionalCosts), pageWidth - 70, yPos)
  yPos += 12
  
  doc.text(getTranslation('pdf_total_closing_costs', PDF_LOCALE), 30, yPos)
  doc.text(formatCurrency(total), pageWidth - 70, yPos)
  
  if (inputs.purchasePrice && total) {
    const percentage = (total / Number(inputs.purchasePrice)) * 100
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...lightGray)
    yPos += 10
    doc.text(`(${formatPercentage(percentage)} ${getTranslation('pdf_of_purchase_price', PDF_LOCALE)})`, 30, yPos)
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setTextColor(...lightGray)
  doc.setFontSize(8)
  doc.text(getTranslation('pdf_disclaimer', PDF_LOCALE), 20, footerY)
  doc.text('PropTrenz - proptrenz.com', 20, footerY + 5)
  
  return doc.output('datauristring').split(',')[1]
}

// Generate PDF for Ownership Cost Calculator
function generateOwnershipCostPDF(inputs: Record<string, string | number>, results: Record<string, unknown>, locale: string): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  const primaryBlue: [number, number, number] = [37, 99, 235]
  const darkGray: [number, number, number] = [31, 41, 55]
  const lightGray: [number, number, number] = [107, 114, 128]
  
  let yPos = 20
  
  // Header
  doc.setFillColor(...primaryBlue)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('PropTrenz', 20, 25)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(getCalculatorName('ownership-cost', PDF_LOCALE), 20, 35)
  
  yPos = 55
  
  // Date - use English for PDF (jsPDF doesn't support Unicode fonts)
  doc.setTextColor(...lightGray)
  doc.setFontSize(10)
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`${getTranslation('pdf_generated', PDF_LOCALE)} ${dateStr}`, 20, yPos)
  yPos += 15

  // Property Value Input
  const propertyValue = typeof inputs.propertyValue === 'number' ? inputs.propertyValue : 0
  if (propertyValue > 0) {
    doc.setTextColor(...darkGray)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(getTranslation('pdf_property_value', PDF_LOCALE), 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(formatCurrency(propertyValue), pageWidth - 60, yPos)
    yPos += 15
  }
  
  // Cost Breakdown
  doc.setTextColor(...darkGray)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(getTranslation('pdf_annual_costs', PDF_LOCALE), 20, yPos)
  yPos += 8
  
  doc.setDrawColor(...primaryBlue)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Get breakdown from results
  const breakdown = (results.breakdown as Record<string, number>) || {}
  const costLabels = getCostItemLabels('ownership', PDF_LOCALE)
  
  Object.entries(breakdown).forEach(([key, value]) => {
    if (costLabels[key] && value > 0) {
      doc.setTextColor(...lightGray)
      doc.text(costLabels[key], 25, yPos)
      doc.setTextColor(...darkGray)
      doc.text(formatCurrency(value), pageWidth - 60, yPos)
      yPos += 7
    }
  })
  
  yPos += 10
  
  // Totals Box
  const annualTotal = typeof results.total === 'number' ? results.total : 0
  const requiredCosts = typeof results.required === 'number' ? results.required : 0
  const optionalCosts = typeof results.optional === 'number' ? results.optional : 0
  
  doc.setFillColor(243, 244, 246)
  doc.roundedRect(20, yPos, pageWidth - 40, 60, 3, 3, 'F')
  yPos += 12
  
  doc.setTextColor(...darkGray)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  
  doc.text(getTranslation('pdf_mandatory_costs', PDF_LOCALE), 30, yPos)
  doc.text(formatCurrency(requiredCosts), pageWidth - 70, yPos)
  yPos += 12
  
  doc.text(getTranslation('pdf_optional_costs', PDF_LOCALE), 30, yPos)
  doc.text(formatCurrency(optionalCosts), pageWidth - 70, yPos)
  yPos += 12
  
  doc.text(getTranslation('pdf_annual_total', PDF_LOCALE), 30, yPos)
  doc.text(formatCurrency(annualTotal), pageWidth - 70, yPos)
  yPos += 12
  
  doc.text(getTranslation('pdf_monthly_average', PDF_LOCALE), 30, yPos)
  doc.text(formatCurrency(annualTotal / 12), pageWidth - 70, yPos)
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setTextColor(...lightGray)
  doc.setFontSize(8)
  doc.text(getTranslation('pdf_disclaimer', PDF_LOCALE), 20, footerY)
  doc.text('PropTrenz - proptrenz.com', 20, footerY + 5)
  
  return doc.output('datauristring').split(',')[1]
}

// Generate PDF for Seller Cost Calculator
function generateSellerCostPDF(inputs: Record<string, string | number>, results: Record<string, number>, locale: string): string {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  const primaryBlue: [number, number, number] = [37, 99, 235]
  const darkGray: [number, number, number] = [31, 41, 55]
  const lightGray: [number, number, number] = [107, 114, 128]
  const successGreen: [number, number, number] = [22, 163, 74]
  
  let yPos = 20
  
  // Header
  doc.setFillColor(...primaryBlue)
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('PropTrenz', 20, 25)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(getCalculatorName('seller-cost', PDF_LOCALE), 20, 35)
  
  yPos = 55
  
  // Date - use English for PDF (jsPDF doesn't support Unicode fonts)
  doc.setTextColor(...lightGray)
  doc.setFontSize(10)
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`Generated: ${dateStr}`, 20, yPos)
  yPos += 15
  
  // Sale Details
  doc.setTextColor(...darkGray)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Sale Details', 20, yPos)
  yPos += 8
  
  doc.setDrawColor(...primaryBlue)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  if (inputs.salePrice) {
    doc.setTextColor(...lightGray)
    doc.text('Sale Price', 25, yPos)
    doc.setTextColor(...darkGray)
    doc.text(formatCurrency(Number(inputs.salePrice)), pageWidth - 60, yPos)
    yPos += 7
  }
  
  if (inputs.purchasePrice) {
    doc.setTextColor(...lightGray)
    doc.text('Original Purchase Price', 25, yPos)
    doc.setTextColor(...darkGray)
    doc.text(formatCurrency(Number(inputs.purchasePrice)), pageWidth - 60, yPos)
    yPos += 10
  }
  
  yPos += 5
  
  // Cost Breakdown
  doc.setTextColor(...darkGray)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Selling Cost Breakdown', 20, yPos)
  yPos += 8
  
  doc.setDrawColor(...primaryBlue)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const costLabels: Record<string, string> = {
    capitalGainsTax: 'Capital Gains Tax (ISR)',
    agentCommission: 'Real Estate Agent Commission',
    fideicomisoCancellation: 'Fideicomiso Cancellation',
    attorneyFee: 'Attorney/Legal Fees',
    notaryFees: 'Notary Fees',
    energyCertificate: 'Energy Certificate',
    trustCancellation: 'Trust Cancellation',
    pendingTaxes: 'Pending Property Taxes',
    otherCosts: 'Other Costs'
  }
  
  // Track displayed costs to calculate total for display
  let displayedCostsTotal = 0
  
  Object.entries(results).forEach(([key, value]) => {
    // Handle null values and ensure value is a positive number
    const numValue = typeof value === 'number' ? value : 0
    if (costLabels[key] && numValue > 0) {
      displayedCostsTotal += numValue
      doc.setTextColor(...lightGray)
      doc.text(costLabels[key], 25, yPos)
      doc.setTextColor(...darkGray)
      doc.text(formatCurrency(numValue), pageWidth - 60, yPos)
      yPos += 7
    }
  })
  
  yPos += 10
  
  // Summary Box
  doc.setFillColor(243, 244, 246)
  doc.roundedRect(20, yPos, pageWidth - 40, 50, 3, 3, 'F')
  yPos += 12
  
  doc.setTextColor(...darkGray)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  
  doc.text('Total Selling Costs', 30, yPos)
  doc.text(formatCurrency(results.totalCosts || 0), pageWidth - 70, yPos)
  yPos += 12
  
  doc.setTextColor(...successGreen)
  doc.text('Net Proceeds', 30, yPos)
  doc.text(formatCurrency(results.netProceeds || 0), pageWidth - 70, yPos)
  yPos += 12
  
  doc.setTextColor(...darkGray)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (inputs.salePrice && results.totalCosts) {
    const percentage = (results.totalCosts / Number(inputs.salePrice)) * 100
    doc.text(`Costs represent ${formatPercentage(percentage)} of sale price`, 30, yPos)
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setTextColor(...lightGray)
  doc.setFontSize(8)
  doc.text('This report is for informational purposes only and does not constitute financial advice.', 20, footerY)
  doc.text('PropTrenz - proptrenz.com', 20, footerY + 5)
  
  return doc.output('datauristring').split(',')[1]
}

// Generate PDF based on calculator type
function generatePDF(
  calculatorType: CalculatorType,
  inputs: Record<string, unknown>,
  results: Record<string, unknown>,
  locale: string
): string {
  switch (calculatorType) {
    case 'roi':
      return generateROIPDF(inputs as Record<string, string | number>, results as Record<string, number>, locale)
    case 'closing-cost':
      return generateClosingCostPDF(inputs as Record<string, string | number>, results, locale)
    case 'ownership-cost':
      return generateOwnershipCostPDF(inputs as Record<string, string | number>, results, locale)
    case 'seller-cost':
      return generateSellerCostPDF(inputs as Record<string, string | number>, results as Record<string, number>, locale)
    default:
      throw new Error(`Unknown calculator type: ${calculatorType}`)
  }
}

// Send email with PDF attachment via Resend
async function sendEmailWithPDF(
  email: string,
  calculatorType: CalculatorType,
  pdfBase64: string,
  locale: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('Email service not configured')
  }
  
  const subject = getEmailSubject(calculatorType, locale)
  const calculatorName = getCalculatorName(calculatorType, locale)
  
  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">PropTrenz</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">${calculatorName}</p>
    </div>
    <div class="content">
      <p>${getTranslation('email_greeting', locale)}</p>
      <p>${getTranslation('email_thanks', locale)}</p>
      <p>${getTranslation('email_includes_title', locale)}</p>
      <ul>
        <li>${getTranslation('email_includes_inputs', locale)}</li>
        <li>${getTranslation('email_includes_results', locale)}</li>
        <li>${getTranslation('email_includes_metrics', locale)}</li>
      </ul>
      <p>${getTranslation('email_cta_text', locale)}</p>
      <a href="https://proptrenz.com?utm_source=email&utm_medium=report&utm_campaign=${calculatorType}" class="button">
        ${getTranslation('email_cta_button', locale)}
      </a>
      <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
        <em>${getTranslation('email_disclaimer', locale)}</em>
      </p>
    </div>
    <div class="footer">
      <p>PropTrenz - ${getTranslation('email_footer', locale)}</p>
      <p>proptrenz.com</p>
    </div>
  </div>
</body>
</html>
`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: REPORT_FROM_EMAIL,
      to: email,
      subject: subject,
      html: emailBody,
      attachments: [
        {
          filename: `proptrenz-${calculatorType}-report.pdf`,
          content: pdfBase64,
        }
      ]
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData?.message || `Failed to send email: ${response.statusText}`)
  }
}

// Save lead to database
async function saveLeadToDatabase(
  email: string,
  calculatorType: CalculatorType,
  inputs: Record<string, unknown>,
  results: Record<string, unknown>,
  locale: string
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[send-calculator-report] Missing Supabase credentials, skipping lead save')
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Map calculator type to source name
  const sourceMap: Record<CalculatorType, string> = {
    'roi': 'roi_calculator_report',
    'closing-cost': 'closing_cost_calculator_report',
    'ownership-cost': 'ownership_cost_calculator_report',
    'seller-cost': 'seller_cost_calculator_report'
  }

  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name: 'Calculator Report Request',
        email: email.trim().toLowerCase(),
        phone: 'N/A',
        city: 'N/A',
        municipality: 'N/A',
        budget_range: 'N/A',
        timeline: 'N/A',
        source: sourceMap[calculatorType],
        context_data: {
          calculatorType,
          inputs,
          results,
          locale,
          requestedAt: new Date().toISOString()
        },
        assigned_agent_email: LEAD_RECIPIENT,
        status: 'new'
      })
      .select()
      .single()

    if (error) {
      console.error('[send-calculator-report] Database error:', error)
      return null
    }

    console.log('[send-calculator-report] Lead saved:', lead.id)
    return lead.id
  } catch (error) {
    console.error('[send-calculator-report] Failed to save lead:', error)
    return null
  }
}

// Send notification email to PropTrenz
async function sendLeadNotificationEmail(
  email: string,
  calculatorType: CalculatorType,
  inputs: Record<string, unknown>,
  results: Record<string, unknown>,
  leadId: string | null,
  locale: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[send-calculator-report] Resend API key not configured, skipping notification')
    return
  }

  const calculatorNames: Record<CalculatorType, string> = {
    'roi': 'Investment ROI Calculator',
    'closing-cost': 'Closing Cost Calculator',
    'ownership-cost': 'Ownership Cost Calculator',
    'seller-cost': 'Seller Cost Calculator'
  }

  // Format inputs and results for display
  const formatValue = (value: unknown): string => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    return String(value ?? 'N/A')
  }

  const inputsList = Object.entries(inputs)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .map(([key, value]) => `<li><strong>${key}:</strong> ${formatValue(value)}</li>`)
    .join('')

  const resultsList = Object.entries(results)
    .filter(([_, v]) => v !== null && v !== undefined)
    .map(([key, value]) => `<li><strong>${key}:</strong> ${formatValue(value)}</li>`)
    .join('')

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin: 0 0 16px; color: #1d4ed8;">New Calculator Report Request</h2>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        ${leadId ? `<p style="margin: 0 0 8px;"><strong>Lead ID:</strong> ${leadId}</p>` : ''}
        <p style="margin: 0 0 8px;"><strong>Calculator:</strong> ${calculatorNames[calculatorType]}</p>
        <p style="margin: 0 0 8px;"><strong>Locale:</strong> ${locale}</p>
        <p style="margin: 0 0 8px;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <h3 style="margin: 16px 0 8px; color: #374151;">Contact Information</h3>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>

      <h3 style="margin: 16px 0 8px; color: #374151;">Calculator Inputs</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${inputsList || '<li>No inputs provided</li>'}
      </ul>

      <h3 style="margin: 16px 0 8px; color: #374151;">Calculator Results</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${resultsList || '<li>No results provided</li>'}
      </ul>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          This lead was generated from a calculator PDF report request on PropTrenz.
        </p>
      </div>
    </div>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: REPORT_FROM_EMAIL,
        to: [LEAD_RECIPIENT],
        subject: `New Calculator Report Lead: ${calculatorNames[calculatorType]}`,
        reply_to: email,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      console.error('[send-calculator-report] Failed to send notification email:', error)
    } else {
      console.log('[send-calculator-report] Notification email sent to', LEAD_RECIPIENT)
    }
  } catch (error) {
    console.error('[send-calculator-report] Notification email error:', error)
    // Don't throw - we still want to continue even if notification fails
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, calculatorType, inputs, results, locale = 'en' } = req.body as ReportRequestBody

    // Validate required fields
    if (!email || !calculatorType || !inputs || !results) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    // Validate calculator type
    const validTypes: CalculatorType[] = ['roi', 'closing-cost', 'ownership-cost', 'seller-cost']
    if (!validTypes.includes(calculatorType)) {
      return res.status(400).json({ error: 'Invalid calculator type' })
    }

    // Generate PDF
    const pdfBase64 = generatePDF(calculatorType, inputs, results, locale)

    // Send email with PDF to user
    await sendEmailWithPDF(email, calculatorType, pdfBase64, locale)

    // Save lead to database (don't block on this)
    const leadId = await saveLeadToDatabase(email, calculatorType, inputs, results, locale)

    // Send notification email to PropTrenz (don't block on this)
    await sendLeadNotificationEmail(email, calculatorType, inputs, results, leadId, locale)

    return res.status(200).json({ success: true, message: 'Report sent successfully' })
  } catch (error) {
    console.error('Error generating/sending report:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate or send report' 
    })
  }
}
