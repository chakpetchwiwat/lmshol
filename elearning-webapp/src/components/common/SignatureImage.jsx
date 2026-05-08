import React from 'react';
import { getFullUrl, getSignaturePreviewUrl, isSignatureStorageKey } from '../../utils/api';

const SignatureImage = ({ src, previewSrc = '', alt = '', className = '', ...props }) => {
  const [resolvedSrc, setResolvedSrc] = React.useState(() => previewSrc || (isSignatureStorageKey(src) ? '' : getFullUrl(src)));

  React.useEffect(() => {
    let cancelled = false;

    const resolveSource = async () => {
      if (!src) {
        setResolvedSrc('');
        return;
      }

      if (previewSrc) {
        setResolvedSrc(previewSrc);
        return;
      }

      if (!isSignatureStorageKey(src)) {
        setResolvedSrc(getFullUrl(src));
        return;
      }

      try {
        const signedUrl = await getSignaturePreviewUrl(src);
        if (!cancelled) setResolvedSrc(signedUrl);
      } catch (error) {
        console.error('Resolve signature preview error:', error);
        if (!cancelled) setResolvedSrc('');
      }
    };

    resolveSource();

    return () => {
      cancelled = true;
    };
  }, [previewSrc, src]);

  if (!resolvedSrc) {
    return null;
  }

  return <img src={resolvedSrc} alt={alt} className={className} {...props} />;
};

export default SignatureImage;
