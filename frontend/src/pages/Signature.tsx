export default function Signature() {
  return (
    <>
      <style>{`
        .signature-wrap {
          margin-top: 24px;
          text-align: center;
          position: relative;
          z-index: 1;
          animation: sigFade 0.6s 0.3s both ease;
        }

        @keyframes sigFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .signature-line {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .signature-dash {
          width: 28px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, rgba(129,140,248,0.5));
        }

        .signature-dash.right {
          background: linear-gradient(90deg, rgba(129,140,248,0.5), transparent);
        }

        .signature-name {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          background: linear-gradient(135deg, #818cf8, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .signature-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: #35354a;
          margin-top: 5px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-weight: 400;
        }
      `}</style>

      <div className="signature-wrap">
        <div className="signature-line">
          <span className="signature-dash" />
          <span className="signature-name">Obed Mavungu</span>
          <span className="signature-dash right" />
        </div>
        <div className="signature-sub">designed &amp; built by</div>
      </div>
    </>
  );
}
