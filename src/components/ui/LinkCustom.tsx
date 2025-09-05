import { TouchableOpacity } from 'react-native';

import { type Href, router } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';

type LinkParams = Record<string, string | number | boolean>;

type Props = {
  href: Href;
  text: string;
  params?: LinkParams;
};

const stringifyParams = (
  params?: LinkParams
): Record<string, string> | undefined => {
  if (!params) return undefined;
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    out[k] = String(v);
  });
  return out;
};

const LinkCustom = ({ href, text, params }: Props) => {
  const handlePress = () => {
    if (!params) {
      router.push(href);
      return;
    }

    const sp = stringifyParams(params);
    if (typeof href === 'string') {
      router.push({ pathname: href as any, params: sp });
    } else {
      // Merge with existing params if provided as object
      const hrefObj: any = href as any;
      router.push({
        ...hrefObj,
        params: { ...(hrefObj.params || {}), ...(sp || {}) }
      });
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <TextCustom type="link">{text}</TextCustom>
    </TouchableOpacity>
  );
};

export default LinkCustom;
