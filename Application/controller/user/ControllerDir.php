<?php

namespace ctCloud\app\controller\user;

use ctCloud\app\common\Base32;
use ctCloud\app\common\CtCloudHelper;
use GuzzleHttp\Client;
use Slim\Http\Request;
use Slim\Http\Response;
use ctCloud\app\mod\D;

class ControllerDir
{
    public function download(Request $req, Response $rsp, array $args)
    {
        $token = Base32::decrypt(base64_decode($args['token']));
        $fileId = $args['file_id'];
        session_id($token);
        session_start();
        if ($_SESSION['user'] === null) {
            session_destroy();
            session_register_shutdown();
            session_write_close();
            return $rsp->withStatus(401);
        }
        $GLOBALS['session'] = $_SESSION;
        session_write_close();

        $d = D::getInstance();
        $fileInfo = [];
        try {
            $fileInfo = $d->getDirListById([
                'id', 'name', 'user_id', 'disk_file_name', 'file_length', 'ct_cloud_download_link', 'extra_cookie', 'ct_link_last_update'
            ], $fileId);
        } catch (\Exception $e) {
        }
        if (empty($fileInfo) || $fileInfo['user_id'] != $GLOBALS['session']['user']['id']) {
            return $rsp->withStatus(404);
        }

//        return $rsp->withJson([
//            'token' => $token,
//            'file_id' => $fileId,
//            'file_info' => $fileInfo
//        ]);
        $realLink = '';
        $extraCookie = '';
        $c = '';
        if (!empty($fileInfo['ct_cloud_download_link']) && time() - $fileInfo['ct_link_last_update'] < 200) {
            $realLink = $fileInfo['ct_cloud_download_link'];
            $extraCookie = $fileInfo['extra_cookie'];
            $d->updateDirInfoById(['ct_link_last_update' => time()], $fileId);
            $c = $d->getConfig('cookie');
        } else {
            $tryCount = 0;
            $jsonRet = [];
            $client = new Client([
                'verify' => false,
                'curl' => [
                    CURLOPT_RESOLVE => ['domain.com:port:8.8.8.8']
                ],
            ]);
            while ($tryCount++ < 3 && empty($jsonRet)) {
                $jsonRet = json_decode($client->get(
                    'https://domain.com:port/get_real_link?fileRecord='
                    . $fileInfo['disk_file_name']
                    . '&authCode=wy-code'
                )->getBody()->getContents(), true);
            }
            if (!empty($jsonRet)) {
                $realLink = $jsonRet['downloadLink'];
                $extraCookie = $jsonRet['cookieName'] . '=' . $jsonRet['cookieValue'];
                $c = $jsonRet['currentCookie'];
                $d->updateConfig($c, 'cookie');
                $d->updateDirInfoById(['ct_cloud_download_link' => $realLink, 'extra_cookie' => $extraCookie, 'ct_link_last_update' => time()], $fileId);
            }
        }

        if (empty($realLink)) {
            return $rsp->withStatus(403);
        }

//        return $rsp->withJson([
//            'data' => (preg_replace('/bytes=/', '', $req->getHeaderLine('range'))),
//            'origin' => $req->getHeaderLine('range')
//        ]);
        if (empty($c)) {
            return $rsp->withStatus(403);
        }
        $tempCookie = $c . '; ' . $extraCookie;
        CtCloudHelper::downloadFile($realLink, $tempCookie, $fileId, $fileInfo['name'], $fileInfo['file_length'], $req->getHeaderLine('range'));
        return $rsp->withStatus(200);
    }

}