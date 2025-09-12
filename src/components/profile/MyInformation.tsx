import React from 'react';
import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { SvgXml } from 'react-native-svg'; // You'll need to install this library to render SVG icons

// You'll need to get the SVG code for the icons
const cameraIconSvg = `<svg viewBox="0 0 24 24" focusable="false" data-testid="CameraIcon"><path fill-rule="evenodd" d="M9 13.5c0-1.927 1.073-3 3-3s3 1.073 3 3-1.073 3-3 3-3-1.073-3-3Zm1.333 0c0 1.184.483 1.667 1.667 1.667 1.184 0 1.667-.483 1.667-1.667 0-1.184-.483-1.667-1.667-1.667-1.184 0-1.667.483-1.667 1.667Z" clip-rule="evenodd"></path><path fill-rule="evenodd" d="M9 7.5H5.503c-.47 0-.871.26-.951.62-.3 1.43-.53 3.13-.55 5.06-.02 2.11.23 4.15.57 5.7.08.36.48.62.95.62h12.993c.47 0 .87-.26.95-.62.721-2.94.711-7.87-.02-10.76-.08-.36-.48-.62-.95-.62H15v-3H9v3Zm4.67-1.67h-3.34V7.5h3.34V5.83Zm4.576 3c.272 1.266.42 2.934.424 4.654.003 1.718-.139 3.397-.407 4.686H5.783a25.346 25.346 0 0 1-.452-4.977c.017-1.639.194-3.102.435-4.363h12.48Z" clip-rule="evenodd"></path></svg>`;
const penIconSvg = `<svg viewBox="0 0 24 24" focusable="false" data-testid="PenIcon" aria-hidden="true"><path fill-rule="evenodd" d="m12.833 4 5.55 9.617c.775 1.343.6 6.383.6 6.383s-4.593-2.583-5.24-3.704l-5.55-9.617L12.833 4Zm-.49 1.83-2.321 1.34 1.246 2.159 2.32-1.34-1.245-2.16Zm-.405 4.66 2.964 5.136c.245.354 1.405 1.177 2.745 2.02-.051-1.624-.211-2.99-.424-3.36L14.258 9.15l-2.32 1.34ZM6.5 19.963a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clip-rule="evenodd"></path></svg>`;
const facebookIconSvg = `<svg viewBox="0 0 24 24" focusable="false" data-testid="FacebookIcon" aria-hidden="true"><circle cx="12" cy="12" fill="#fff" r="8"></circle><path d="m20 12c0-4.41824-3.5818-8-8-8-4.41824 0-8 3.58176-8 8 0 3.7517 2.58304 6.8998 6.0675 7.7645v-5.3197h-1.64958v-2.4448h1.64958v-1.0534c0-2.72292 1.2323-3.985 3.9056-3.985.5069 0 1.3815.09952 1.7392.19872v2.216c-.1888-.01984-.5168-.02976-.9241-.02976-1.3117 0-1.8186.49696-1.8186 1.78884v.8646h2.6131l-.4489 2.4448h-2.1642v5.4966c3.9613-.4784 7.0307-3.8512 7.0307-7.9414z" fill="#0866ff"></path></svg>`;
const googleIconSvg = `<svg viewBox="0 0 24 24" focusable="false" data-testid="GoogleIcon" aria-hidden="true"><path fill="#EA4335" d="M12 7.167c1.18 0 2.237.406 3.07 1.2l2.283-2.284C15.967 4.793 14.157 4 12 4a7.996 7.996 0 0 0-7.147 4.407l2.66 2.063c.63-1.897 2.4-3.303 4.487-3.303Z"></path><path fill="#4285F4" d="M19.66 12.183c0-.523-.05-1.03-.127-1.516H12v3.006h4.313a3.718 3.718 0 0 1-1.593 2.394l2.577 2c1.503-1.394 2.363-3.454 2.363-5.884Z"></path><path fill="#FBBC05" d="M7.51 13.53A4.86 4.86 0 0 1 7.257 12c0-.533.09-1.047.253-1.53L4.85 8.407A7.971 7.971 0 0 0 4 12a7.93 7.93 0 0 0 .853 3.593L7.51 13.53Z"></path><path fill="#34A853" d="M12 20c2.16 0 3.977-.71 5.297-1.937l-2.577-2c-.717.484-1.64.767-2.72.767-2.087 0-3.857-1.407-4.49-3.303L4.85 15.59A8.002 8.002 0 0 0 12 20Z"></path></svg>`;
const appleIconSvg = `<svg viewBox="0 0 24 24" focusable="false" data-testid="AppleIcon" aria-hidden="true"><path d="M13.041 7.543a2.46 2.46 0 0 1-.978.182c-.064-.001-.088-.018-.092-.087-.053-.643.12-1.231.428-1.785.528-.947 1.33-1.531 2.374-1.788.09-.023.181-.034.279-.047L15.183 4l.005.123c.003.06.006.116.007.172.023 1.16-.725 2.679-2.154 3.248Zm5.41 8.326.049-.144c-1.263-.631-2.034-1.604-2.13-3.04-.095-1.437.559-2.497 1.706-3.3a1.789 1.789 0 0 0-.03-.045l-.005-.006a3.527 3.527 0 0 0-1.798-1.33 3.994 3.994 0 0 0-1.61-.202c-.367.03-.72.133-1.066.26-.338.126-.675.254-1.012.383a1.238 1.238 0 0 1-.911.003c-.33-.124-.66-.25-.989-.376a3.182 3.182 0 0 0-1.916-.15c-1.09.256-1.917.877-2.504 1.824-.467.754-.67 1.59-.722 2.468a8.158 8.158 0 0 0 .178 2.172 10.31 10.31 0 0 0 2.145 4.47c.227.278.47.54.759.754.233.173.484.307.77.361.33.062.652.02.963-.085.187-.063.37-.138.553-.214l.239-.097c.73-.29 1.47-.325 2.212-.054.148.054.294.116.44.178.078.034.157.068.237.1.311.128.635.19.971.179.449-.016.836-.189 1.173-.475.17-.144.335-.3.477-.47.734-.882 1.339-1.843 1.737-2.926.03-.08.057-.16.083-.238Z"></path></svg>`;

const MyInformation = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>My information</Text>
      <View style={styles.divider} />

      <View style={styles.stack}>
        <View style={styles.stackRow}>
          <View style={styles.thumbnailContainer}>
            <View style={styles.pictureContainer}>
              <Image
                source={{
                  uri: 'https://cdn-images.dzcdn.net/images/user/1e6aea2125f4eb6b351410092ec033ab/125x125-000000-80-0-0.jpg'
                }}
                style={styles.picture}
              />
            </View>
            {/* File input is not a standard RN component, you'll need a library */}
            <View>
              <Button
                title=""
                onPress={() => {
                  /* handle file upload */
                }}
              />
              <SvgXml xml={cameraIconSvg} width="24" height="24" />
            </View>
          </View>
          <View style={styles.stackColumn}>
            <Text style={styles.subHeading}>Stanislav Krivtsov</Text>
            <Text style={styles.text}>You're enjoying Deezer Free.</Text>
          </View>
          <Button
            title="Manage my subscription"
            onPress={() => {
              /* handle subscription */
            }}
          />
        </View>
      </View>

      <View style={styles.accountSection}>
        <Text style={styles.subHeading}>Log in</Text>
        <View style={styles.divider} />
        <View style={styles.stack}>
          <View style={styles.formControl}>
            <Text style={styles.label}>Your e-mail:</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={styles.input}
                value="stan.krivtsov@gmail.com"
                editable={false}
              />
              <Button
                title=""
                onPress={() => {
                  /* handle email change */
                }}
              />
              <SvgXml xml={penIconSvg} width="24" height="24" />
            </View>
          </View>
          <View style={styles.formControl}>
            <Text style={styles.label}>Your password:</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={styles.input}
                value="*****"
                secureTextEntry={true}
                editable={false}
              />
              <Button
                title=""
                onPress={() => {
                  /* handle password change */
                }}
              />
              <SvgXml xml={penIconSvg} width="24" height="24" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.accountSection}>
        <Text style={styles.subHeading}>
          Deezer information that can be seen by other Deezer users
        </Text>
        <View style={styles.divider} />
        <View style={styles.stack}>
          {/* Radio buttons and dropdowns are not standard RN components, you'll need a library */}
          <View style={styles.formControl}>
            <Text style={styles.label}>I identify as</Text>
            {/* You'll need to implement radio button logic */}
            <View style={styles.stackRow}>
              <Text>Male</Text>
              <Text>Female</Text>
              <Text>Non-binary</Text>
            </View>
          </View>
          <View style={styles.formControl}>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} value="Stanislav Krivtsov" />
          </View>
        </View>
      </View>

      <View style={styles.accountSection}>
        <Text style={styles.subHeading}>Private information</Text>
        <View style={styles.divider} />
        <View style={styles.stack}>
          <View style={styles.stackColumn}>
            <Button
              title="Privacy settings"
              onPress={() => {
                /* navigate to privacy settings */
              }}
            />
            <Button
              title="My personal data"
              onPress={() => {
                /* navigate to personal data */
              }}
            />
          </View>
          <View style={styles.stackColumn}>
            {/* Date pickers/selectors are not standard RN components, you'll need a library */}
            <View style={styles.formControl}>
              <Text style={styles.label}>Date of birth</Text>
              <View style={styles.stackRow}>
                {/* You'll need to implement date picker components */}
                <Text>Day Select</Text>
                <Text>Month Select</Text>
                <Text>Year Select</Text>
              </View>
            </View>
            <View style={styles.formControl}>
              <Text style={styles.label}>Language</Text>
              {/* You'll need to implement a dropdown/select component */}
              <Text>Language Select</Text>
            </View>
          </View>
          <View>
            <Button
              title="Save"
              onPress={() => {
                /* handle save */
              }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16 // Adjust padding as needed
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc', // Adjust color as needed
    marginVertical: 16 // Adjust margin as needed
  },
  stack: {
    marginBottom: 16 // Adjust spacing as needed
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8 // Adjust spacing as needed
  },
  stackColumn: {
    marginBottom: 8 // Adjust spacing as needed
  },
  thumbnailContainer: {
    marginRight: 16 // Adjust spacing as needed
  },
  pictureContainer: {
    width: 100, // Adjust size as needed
    height: 100, // Adjust size as needed
    borderRadius: 50, // Adjust for circular image
    overflow: 'hidden'
  },
  picture: {
    width: '100%',
    height: '100%'
  },
  text: {
    fontSize: 14
  },
  accountSection: {
    marginTop: 24 // Adjust spacing as needed
  },
  formControl: {
    marginBottom: 16 // Adjust spacing as needed
  },
  label: {
    fontSize: 14,
    marginBottom: 4
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc', // Adjust color as needed
    padding: 8,
    marginRight: 8 // Adjust spacing as needed
  }
});

export default MyInformation;
