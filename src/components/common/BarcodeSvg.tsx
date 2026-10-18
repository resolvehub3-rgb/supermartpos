import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSvgProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  format = 'CODE128',
  width = 1.8,
  height = 48,
  displayValue = true,
  fontSize = 12,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        displayValue,
        fontSize,
        font: 'Montserrat, monospace',
        textMargin: 2,
        margin: 4,
        background: '#ffffff',
        lineColor: '#242424',
      });
    } catch (err) {
      console.warn('Barcode rendering error (switching to CODE128 fallback):', err);
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          font: 'Montserrat, monospace',
          textMargin: 2,
          margin: 4,
        });
      } catch (fallbackErr) {
        console.error('Failed to render fallback barcode:', fallbackErr);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return <svg ref={svgRef} className={`max-w-full ${className}`} />;
};
