var ENDPOINTS = {
  "search/tweets":{
    label: 'Search term',
    placeholder: '#TAGS OR from:mhawksey',
    tooltip: 'Enter a search term ',
    url: 'https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets',
    rate_limit: 180,
    refresh_win: 15,
    max:18000,
    params: { 
      q: 'req', // maximum 500 chars
      geocode: '',
      lang: '',
      result_type: 'recent',
      count: 100,
      until: '',
      since_id: '',
      max_id: '',
      include_entities: true
    }
  },
  "favorites/list":{
    label: 'User likes',
    placeholder: 'mhawksey',
    tooltip: 'Enter the screen name e.g. mhawksey',
    url: 'https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/get-favorites-list',
    rate_limit: 75,
    refresh_win: 15,
    params: { 
      screen_name: 'req',
      count: 200,
      since_id: '',
      max_id: '',
      include_entities: true
    }
  },
  "followers/list":{
    label: 'User\'s followers',
    placeholder: 'mhawksey',
    tooltip: 'Enter the screen name e.g. mhawksey',
    url: 'https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-followers-list',
    rate_limit: 15,
    refresh_win: 15,
    params: { 
      screen_name: 'req',
      cursor: -1,
      count: 200,
      include_user_entities: true
    }
  },
  "friends/list":{
    label: 'User\'s friends (following)',
    placeholder: 'mhawksey',
    tooltip: 'Enter the screen name e.g. mhawksey',
    url: 'https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-friends-list',  
    rate_limit: 15,
    refresh_win: 15,
    params: { 
      screen_name: 'req',
      cursor: -1,
      count: 200,
      include_user_entities: true
    }
  },
  "lists/members":{
    label: 'List members',
    placeholder: 'https://twitter.com/mhawksey/lists/guug11',
    tooltip: 'Enter list url e.g. https://twitter.com/mhawksey/lists/guug11',
    url: 'https://developer.twitter.com/en/docs/accounts-and-users/create-manage-lists/api-reference/get-lists-members',
    rate_limit: 900,
    refresh_win: 15,
    params: { 
      owner_screen_name: 'req',
      slug: 'req',
      cursor: -1,
      count: 5000,
      include_entities: true
    }
  },
  "lists/statuses":{
    label: 'List statuses',
    placeholder: 'https://twitter.com/mhawksey/lists/guug11',
    tooltip: 'Enter list url e.g. https://twitter.com/mhawksey/lists/guug11',
    url: 'https://developer.twitter.com/en/docs/accounts-and-users/create-manage-lists/api-reference/get-lists-statuses',
    rate_limit: 900,
    refresh_win: 15,
    params: { 
      owner_screen_name: 'req',
      slug: 'req',
      since_id: '',
      max_id: '',
      count: 5000, // ? not documented 
      include_entities: true
    }
  },
  "statuses/user_timeline":{
    label: 'User timeline',
    placeholder: 'mhawksey',
    tooltip: 'Enter the screen name e.g. mhawksey',
    url: 'https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline',
    rate_limit: 900,
    refresh_win: 15,
    max: 3200,
    params: { 
      screen_name: 'req',
      since_id: '',
      max_id: '',
      count: 200,
      include_entities: true
    }
  }
}

var COLS = {
  "search/tweets": [{
    "text": "Tweet",
    "children": [{id: 'from_user', 'is_default': true, 'is_legacy': true },
                 {id: 'text', 'is_default': true, 'is_legacy': true },
                 {id: 'created_at', 'is_default': true },
                 {id: 'time', 'is_default': true, 'is_legacy': true },
                 {id: 'in_reply_to_screen_name', 'is_default': true },
                 {id: 'from_user_id_str', 'is_default': true, 'is_legacy': true },
                 {id: 'in_reply_to_status_id_str', 'is_default': true },
                 {id: 'source', 'is_default': true },
                 {id: 'profile_image_url', 'is_default': true, 'is_legacy': true },
                 {id: 'status_url', 'is_default': true, 'is_legacy': true },
                 {id: 'entities_str', 'is_default': true },
                 {id: 'in_reply_to_user_id_str', 'is_default': true },
                 {id: 'contributors' },
                 {id: 'coordinates' },
                 {id: 'display_text_range_0' },
                 {id: 'display_text_range_1' },
                 {id: 'extended_entities_str' },
                 {id: 'favorite_count' },
                 {id: 'favorited' },
                 {id: 'full_text' },
                 {id: 'geo' },
                 {id: 'is_quote_status' },
                 {id: 'lang' },
                 {id: 'metadata_iso_language_code' },
                 {id: 'metadata_result_type' },
                 {id: 'place' },
                 {id: 'possibly_sensitive' },
                 {id: 'retweet_count' },
                 {id: 'retweeted' },
                 {id: 'truncated' },
                ]},{
      "text": "User",
      "children": [{id: 'user_followers_count', 'is_default': true },
                   {id: 'user_friends_count', 'is_default': true },
                   {id: 'user_location', 'is_default': true },
                   {id: 'user_lang'},
                   {id: 'user_contributors_enabled' },
                   {id: 'user_created_at' },
                   {id: 'user_default_profile' },
                   {id: 'user_default_profile_image' },
                   {id: 'user_description' },
                   {id: 'user_entities_str' },
                   {id: 'user_favourites_count' },
                   {id: 'user_follow_request_sent' },
                   {id: 'user_following' },
                   {id: 'user_geo_enabled' },
                   {id: 'user_has_extended_profile' },
                   {id: 'user_id_str' },
                   {id: 'user_is_translation_enabled' },
                   {id: 'user_is_translator' },
                   {id: 'user_listed_count' },
                   {id: 'user_name' },
                   {id: 'user_notifications' },
                   {id: 'user_profile_background_color' },
                   {id: 'user_profile_background_image_url' },
                   {id: 'user_profile_background_image_url_https' },
                   {id: 'user_profile_background_tile' },
                   {id: 'user_profile_banner_url' },
                   {id: 'user_profile_image_url' },
                   {id: 'user_profile_image_url_https' },
                   {id: 'user_profile_link_color' },
                   {id: 'user_profile_sidebar_border_color' },
                   {id: 'user_profile_sidebar_fill_color' },
                   {id: 'user_profile_text_color' },
                   {id: 'user_profile_use_background_image' },
                   {id: 'user_protected' },
                   {id: 'user_screen_name' },
                   {id: 'user_statuses_count' },
                   {id: 'user_time_zone' },
                   {id: 'user_translator_type' },
                   {id: 'user_url' },
                   {id: 'user_utc_offset' },
                   {id: 'user_verified' }]
       }
 ]
};