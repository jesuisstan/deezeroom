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
