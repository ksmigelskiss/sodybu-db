import { useState, useRef } from 'react';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { uploadVietaPhoto } from '../lib/photos.js';

export default function PhotoStrip({ vieta, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState(null);
  const inputRef = useRef();
  const photos = vieta.nuotraukos ?? [];

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map(f => uploadVietaPhoto(vieta.id, f))
      );
      await onUpdate(vieta.id, { nuotraukos: [...photos, ...urls] });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (idx) => {
    const next = photos.filter((_, i) => i !== idx);
    await onUpdate(vieta.id, { nuotraukos: next });
    setLightbox(null);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {photos.map((url, i) => (
          <img
            key={url}
            src={url}
            alt=""
            onClick={() => setLightbox(i)}
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0, cursor: 'pointer' }}
          />
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: 72, height: 72, borderRadius: 8, flexShrink: 0,
            border: '1.5px dashed #dadce0', background: uploading ? '#f8f9fa' : 'white',
            cursor: uploading ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, color: '#9aa0a6', fontSize: 10, fontWeight: 500,
          }}
        >
          <Camera size={18} color={uploading ? '#dadce0' : '#9aa0a6'} />
          {uploading ? 'Kraunama…' : 'Foto'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img
            src={photos[lightbox]}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 4 }}
          />

          {lightbox > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1); }} style={navBtn('left')}>
              <ChevronLeft size={24} />
            </button>
          )}
          {lightbox < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1); }} style={navBtn('right')}>
              <ChevronRight size={24} />
            </button>
          )}

          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            <X size={18} />
          </button>

          <button
            onClick={e => { e.stopPropagation(); removePhoto(lightbox); }}
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(197,34,31,0.85)', border: 'none', borderRadius: 8,
              padding: '8px 20px', cursor: 'pointer', color: 'white', fontSize: 12, fontWeight: 600,
            }}
          >
            Ištrinti nuotrauką
          </button>
        </div>
      )}
    </>
  );
}

const navBtn = (side) => ({
  position: 'absolute', [side]: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
  width: 44, height: 44, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
});
