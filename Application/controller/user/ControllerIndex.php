<?php

namespace ctCloud\app\controller\user;

use ctCloud\app\common\ParamChecker;
use Slim\Container;
use Slim\Http\Request;
use Slim\Http\Response;
use Slim\Views\PhpRenderer;
use ctCloud\app\mod\D;
use ctCloud\app\mod\C;
use ctCloud\app\common\Base32;

class ControllerIndex
{
    private $container;
    /**
     * @var PhpRenderer $renderer
     */
    private $renderer;

    public function __construct(Container $container)
    {
        $this->container = $container;
        $this->renderer = $container->get('renderer');
    }

    public function index(Request $req, Response $rsp, array $args)
    {
        $data = [
            'hiddenLi' => 'hidden',
            'currentDirId' => $GLOBALS['session']['user']['root_dir_id'],
            'currentPage' => '1',
            'currentSort' => '6',
            'keywords' => '',
            'isSearch' => 'false',
        ];
        return $this->renderer->render($rsp, 'user/index.phtml', $data);
    }

    public function doIndex(Request $req, Response $rsp, array $args)
    {
        $param = $req->getQueryParams();
        ParamChecker::checkArrayKeyExist([
            'page'
        ], $param);

        if (array_key_exists('pid', $param)) {
            return $this->doIndexByPid($req, $rsp, $args);
        } else if (array_key_exists('keywords', $param)) {
            return $this->doIndexByKeywords($req, $rsp, $args);
        } else {
            return $rsp->withStatus(400);
        }
    }

    private function doIndexByPid(Request $req, Response $rsp, array $args)
    {
        $param = $req->getQueryParams();
        $param['pid'] = (int)$param['pid'];
        $param['page'] = (int)$param['page'];
        if ($param['pid'] < 0) $param['pid'] = 0;
        if ($param['page'] < 1) $param['page'] = 1;
        $d = D::getInstance();
//        return $rsp->withJson([
//            'data'=>$d->getCharset()
//        ]);
        $pDir = $d->getDirListById([
            'id', 'pid', 'name', 'user_id'
        ], $param['pid']);
        $indexList = [];
        $indexDirs = [];
        $aboveDirList = [];
        if ($param['page'] > 1) {
            $prev = $param['page'] - 1;
        } else {
            $prev = 1;
        }
        $next = 1;
        if (!empty($pDir) && $pDir['user_id'] == $GLOBALS['session']['user']['id']) {
            $indexList = $d->getDirListByPid([
                'id', 'name', 'pid', 'file_length', 'is_dir', 'create_time', 'tag'
            ], $param['pid'], $param['page']);
            foreach ($indexList as &$indexRow) {
                $indexRow['is_dir'] = (int)$indexRow['is_dir'];
            }
            if (sizeof($indexList) > C::INDEX_PAGE_SIZE) {
                unset($indexList[C::INDEX_PAGE_SIZE]);
                $next = $param['page'] + 1;
            } else {
                $next = $param['page'];
            }

            $tempDirInfo = $pDir;
            while (!empty($tempDirInfo) && $tempDirInfo['id'] != 0) {
                $indexDirs[] = $tempDirInfo;
                $tempDirInfo = $d->getDirListById([
                    'id', 'pid', 'name', 'user_id'
                ], $tempDirInfo['pid']);
            }
            for ($i = sizeof($indexDirs) - 1; $i >= 0; $i--) {
                $aboveDirList[] = $indexDirs[$i];
            }
        }


        return $rsp->withJson([
            'code' => 0,
            'msg' => 'ok',
            'currentDirId' => $param['pid'],
            'currentPage' => $param['page'],
            'currentSort' => 6,
            'keywords' => '',
            'prev' => $prev,
            'next' => $next,
            'prjPath' => '',
            'userDirs' => $indexList,
            'aboveDirList' => $aboveDirList,
            'token' => base64_encode(Base32::encrypt(session_id())),
            'resultCount' => count($indexList),
        ]);
    }

    private function doIndexByKeywords(Request $req, Response $rsp, array $args)
    {
        $param = $req->getQueryParams();
        $param['page'] = (int)$param['page'];
        if ($param['page'] < 1) $param['page'] = 1;
        $d = D::getInstance();
//        return $rsp->withJson([
//            'data'=>$d->getCharset()
//        ]);
        $indexList = [];
        $indexDirs = [];
        if ($param['page'] > 1) {
            $prev = $param['page'] - 1;
        } else {
            $prev = 1;
        }

        $indexList = $d->getDirListByKeywords([
            'id', 'name', 'pid', 'file_length', 'is_dir', 'create_time'
        ], $param['keywords'], $param['page'], $GLOBALS['session']['user']['id']);
        foreach ($indexList as &$indexRow) {
            $indexRow['is_dir'] = (int)$indexRow['is_dir'];
        }
        if (sizeof($indexList) > C::INDEX_PAGE_SIZE) {
            unset($indexList[C::INDEX_PAGE_SIZE]);
            $next = $param['page'] + 1;
        } else {
            $next = $param['page'];
        }

        $aboveDirList = [];


        return $rsp->withJson([
            'code' => 0,
            'msg' => 'ok',
            'currentDirId' => $param['pid'],
            'currentPage' => $param['page'],
            'currentSort' => 6,
            'keywords' => '',
            'prev' => $prev,
            'next' => $next,
            'prjPath' => '',
            'userDirs' => $indexList,
            'aboveDirList' => $aboveDirList,
            'token' => base64_encode(Base32::encrypt(session_id())),
        ]);
    }

    public function doRenameTag(Request $req, Response $rsp, array $args)
    {
        $body = $req->getParsedBody();
        ParamChecker::checkArrayKeyExist(['dirId', 'newName'], $body);
        $d = D::getInstance();
        $d->updateTagByFileId($body['newName'], $body['dirId']);
        return $rsp->withJson([
            'code' => 0,
            'msg' => 'ok'
        ]);
    }
}