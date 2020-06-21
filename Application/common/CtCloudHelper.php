<?php

namespace ctCloud\app\common;

use ctCloud\app\mod\D;

class CtCloudHelper
{
    public static function downloadFile($url, $tempCookie, $fileId, $filename, $fileLength, $range = null)
    {
        $match = [];
        if (preg_match_all('/^http[s]?:\/\/(.*?)(\/.*?|$)/', $url, $match)) {
            $domain = $match[1][0];
        } else {
            $domain = '';
        }

        $headerArr = [
            'accept-encoding' => 'gzip',
            'host' => $domain,
            'connection' => 'close',
            'cookie' => $tempCookie,
            'user-agent' => 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.119 Safari/537.36',
        ];

        if (!empty($range)) {
            $headerArr['range'] = $range;
        }

        @set_time_limit(0);
        @ignore_user_abort(false);
        @ob_end_clean();

        $start = 0;
        $end = $fileLength;

        header_remove('Set-Cookie');
        header('Content-Type: application/octet-stream; charset=');
        header('Content-Disposition: attachment; filename=' . $filename);
        if (!empty($range)) {
            $range = preg_replace('/bytes=/', '', $range);
            if (preg_match('/.*?-$/', $range)) {
                $range .= ($fileLength - 1);
            }
//            touch('R:\range');
//            $h = fopen('R:\range', 'r+w');
//            fwrite($h, json_encode(['data' => preg_match('/.*?-$/', $range), 'range' => $range]));
//            fflush($h);
//            fclose($h);
            $rangeArr = explode('-', $range);
            if (count($rangeArr) == 2) {
                $start = (integer)$rangeArr[0];
                $end = (integer)$rangeArr[1];
                if ($end < $start) {
                    $start = 0;
                    $end = $fileLength;
                }
            }

            header('Accept-Ranges: bytes');
            header('Content-Range: bytes ' . $start . '-' . $end . '/' . $fileLength);
            header('Content-Length: ' . ($end - $start + 1));
            header('HTTP/1.1 206 Partial Content');
        } else {
            header('Content-Length: ' . $fileLength);
            header('HTTP/1.1 200 OK');
        }

        $cookieArr = [];
        $cookieSpl = explode(';', $tempCookie);
        foreach ($cookieSpl as $c) {
            $cArr = explode('=', $c);
            $cookieArr[trim($cArr[0])] = trim($cArr[1]);
        }
        $cookieJar = \GuzzleHttp\Cookie\CookieJar::fromArray($cookieArr, $domain);
        $reqOptions = [
            'allow_redirects' => false,
            'headers' => $headerArr,
            'cookies' => $cookieJar,
            'stream' => true,
        ];

        $d = D::getInstance();
        try {
            $client = new \GuzzleHttp\Client(['verify' => false]);
            $resp = $client->get($url, $reqOptions);
            $body = $resp->getBody();
            $printCount = 0;
            while (!$body->eof()) { // && (connection_status() == 0)
                $strArr = $body->read(1024);
                $len = strlen($strArr);
                for ($j = 0; $j < $len; $j++) {
                    $strArr[$j] = chr(self::decryptByte(ord($strArr[$j])));
                }

                print $strArr;
                flush();

                if ($printCount++ > 10240) {
                    $printCount = 0;
                    try {
                        $d->updateDirInfoById(['ct_link_last_update' => time()], $fileId);
                    } catch (\Exception $e) {
                    }
                }
            }
        } catch (\Exception $e) {
            $error = [
                'url' => $url,
                'cookie' => $tempCookie,
                'error_message' => $e->getMessage()
            ];
            try {
                $d->log2DB(json_encode($error, JSON_UNESCAPED_SLASHES + JSON_UNESCAPED_UNICODE));
                $d->updateDirInfoById(['ct_cloud_download_link' => ''], $fileId);
            } catch (\Exception $e) {
            }
        }
        die();
    }

    private static function decryptByte($byte)
    {
        if ($byte <= 1) {
            $byte += 48;
        } else if ($byte <= 101) {
            $byte -= 130;
        } else if ($byte <= 127) {
            $byte -= 52;
        } else if ($byte <= 179) {
            $byte -= 52;
        } else if ($byte <= 255) {
            $byte -= 208;
        }


        return $byte;
    }
}