<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Only the development frontend origins listed in CORS_ALLOWED_ORIGINS may
    | call the API from a browser. Tokens are sent as the "Authorization"
    | bearer header (not cookies), so supports_credentials stays false and
    | origins can be listed explicitly.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000'))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
