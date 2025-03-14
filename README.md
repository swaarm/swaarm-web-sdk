# Swaarm SDK

The **Swaarm SDK** is an attribution and measurement SDK that enables interaction with the Swaarm platform through a simple API.

## Installation

You can include the SDK in your project by either:

1. Adding `dist/swaarm-web-sdk.min.js` to your HTML page.
2. Installing it via npm:

   [Swaarm SDK on npm](https://www.npmjs.com/package/@swaarm/swaarm-web-sdk)

## Configuration

To configure the Swaarm SDK, initialize it using:

```javascript
SwaarmSdk.initialize("example.swaarm.com", "<token>");
```

Replace `"example.swaarm.com"` with your Swaarm tracking domain and `"<token>"` with your specific access token.

### Optional Parameters:
- **Callback**: Invoked once initialization completes.
- **Attribution Callback**: Invoked when attribution data is available (see [Attribution Data](#attribution-data)).
- **Event Interval**: Time (in seconds) between sending events to the server.
- **Debug Mode**: Enables additional logging.

#### Example:
```javascript
SwaarmSdk.initialize(
    "https://my-tracking-domain",
    "my-token",
    () => console.log("Initialization finished"),
    (attributionData) => console.log("Attribution data available", attributionData),
    2,  // Event interval in seconds
    true // Debug mode enabled
);
```

## Usage

### Registering the User for Attribution
To register the user for attribution on landing pages, use:

```javascript
SwaarmSdk.land();
```

### Sending Custom Events
Use the `event` method to track user actions.

#### Parameters:
- **`typeId`** *(string, required)* – Type of event (e.g., `"registration"`).
- **`aggregatedValue`** *(number, optional)* – Value aggregated in reports (e.g., number of items purchased).
- **`customValue`** *(string, optional)* – Free-form string value for event details.
- **`revenue`** *(number, optional)* – Monetary value associated with the event.
- **`currency`** *(string, optional)* – Currency for the revenue value.

#### Example:
```javascript
SwaarmSdk.event(
  'registration',
  25.0,
  '{"email": "example@example.org"}'
);
```

## Attribution Data

The Swaarm SDK periodically contacts the server to retrieve attribution data until valid data is received.

### Retrieving Attribution Data
To get the currently available attribution data:

```javascript
SwaarmSdk.getAttributionData();
```

### Registering an Attribution Callback
You can register a callback function to be invoked when successful attribution happens:

```javascript
SwaarmSdk.initialize(
    "https://my-tracking-domain",
    "my-token",
    () => console.log("Initialization finished"),
    (attributionData) => console.log("Attribution data available", attributionData),
    2,
    true
);
```

---

## Attribution Data Schema

### UML Diagram
```plaintext
+------------------------------------+
|   AttributionData                  |
+------------------------------------+
| - offer: AttributionOffer?         |
| - publisher: AttributionPublisher? |
| - ids: Ids?                        |
| - decision: PostbackDecision?      |
+------------------------------------+
        |
        |------------------> +-------------------------+
                             |   AttributionOffer      |
                             +-------------------------+
                             | - id: String?           |
                             | - name: String?         |
                             | - lpId: String?         |
                             | - campaignId: String?   |
                             | - campaignName: String? |
                             | - adGroupId: String?    |
                             | - adGroupName: String?  |
                             | - adId: String?         |
                             | - adName: String?       |
                             +-------------------------+

        |------------------> +-----------------------+
                             |  AttributionPublisher |
                             +-----------------------+
                             | - id: String?         |
                             | - name: String?       |
                             | - subId: String?      |
                             | - subSubId: String?   |
                             | - site: String?       |
                             | - placement: String?  |
                             | - creative: String?   |
                             | - app: String?        |
                             | - appId: String?      |
                             | - unique1: String?    |
                             | - unique2: String?    |
                             | - unique3: String?    |
                             | - groupId: String?    |
                             +-----------------------+

        |------------------> +----------------------+
                             |       Ids            |
                             +----------------------+
                             | - installId: String? |
                             | - clickId: String?   |
                             | - userId: String?    |
                             +----------------------+

        |------------------> +-----------------------+
                             |   PostbackDecision    |
                             +-----------------------+
                             | - passed              |
                             | - failed              |
                             +-----------------------+
```

### Class: `AttributionData`
Contains details about the offer, publisher, IDs, and postback decision.

#### Fields:
- **`offer`** (`AttributionOffer?`) – Offer information.
- **`publisher`** (`AttributionPublisher?`) – Publisher details.
- **`ids`** (`Ids?`) – Attribution identifiers.
- **`decision`** (`PostbackDecision?`) – Attribution decision (`passed` or `failed`).

---

### Class: `AttributionOffer`
Holds details about the offer involved in the attribution.

#### Fields:
- **`id`** – Offer ID.
- **`name`** – Offer name.
- **`lpId`** – Landing page ID.
- **`campaignId`** – Campaign ID.
- **`campaignName`** – Campaign name.
- **`adGroupId`** – Ad group ID.
- **`adGroupName`** – Ad group name.
- **`adId`** – Ad ID.
- **`adName`** – Ad name.

---

### Class: `AttributionPublisher`
Holds details about the publisher responsible for serving the offer.

#### Fields:
- **`id`** – Publisher ID.
- **`name`** – Publisher name.
- **`subId`** – Tracking sub-identifier.
- **`subSubId`** – Secondary tracking sub-identifier.
- **`site`** – Website where the ad was displayed.
- **`placement`** – Ad placement location.
- **`creative`** – Ad creative.
- **`app`** – Application where the ad appeared.
- **`appId`** – Application ID.
- **`unique1`**, **`unique2`**, **`unique3`** – Unique tracking identifiers.
- **`groupId`** – External publisher ID (e.g., CRM, anti-fraud tool).

---

### Class: `Ids`
Contains identifiers related to the attribution process.

#### Fields:
- **`installId`** – App installation ID.
- **`clickId`** – Click event ID.
- **`userId`** – User ID.

---

### Enum: `PostbackDecision`
Represents possible postback outcomes.

#### Values:
- **`passed`** – Postback succeeded.
- **`failed`** – Postback failed.

---

## Assigning Application-Specific User IDs

To associate in-app users with SDK users, use:

```javascript
SwaarmSdk.associateUserId("in-app-user-id");
```

This will enable the SDK to distinguish between sessions created by different users, and sessions created by the same
user across different devices.
